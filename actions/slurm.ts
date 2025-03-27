// app/actions/slurm.ts
"use server";

import { revalidateTag } from "next/cache";
import { env } from "process";
import { PrometheusDriver } from "prometheus-query";

// Constants
const PROMETHEUS_URL = process.env.PROMETHEUS_URL;
const MAX_DATA_POINTS = 200;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache for node list

// Initialize Prometheus driver if URL is available
let prom: PrometheusDriver | null = null;
if (PROMETHEUS_URL) {
  prom = new PrometheusDriver({
    endpoint: PROMETHEUS_URL,
    baseURL: "/api/v1",
  });
}

// Cache for cluster nodes
let clusterNodesCache: {
  timestamp: number;
  nodes: any[];
  nodeNames: string[];
} = {
  timestamp: 0,
  nodes: [],
  nodeNames: [],
};

/**
 * Fetches nodes data from the Slurm API and calculates derived information
 */
export async function getNodes() {
  // Return cached nodes if they're still fresh
  const now = Date.now();
  if (
    now - clusterNodesCache.timestamp < CACHE_TTL &&
    clusterNodesCache.nodes.length > 0
  ) {
    console.log("Using cached cluster nodes list");
    return {
      nodes: clusterNodesCache.nodes,
      nodeNames: clusterNodesCache.nodeNames,
      last_update: { number: clusterNodesCache.timestamp },
    };
  }

  try {
    // Fetch node information from Slurm API
    const res = await fetch(
      `http://${env.SLURM_SERVER}:6820/slurm/${env.SLURM_API_VERSION}/nodes`,
      {
        headers: {
          "X-SLURM-USER-NAME": `${env.SLURM_API_ACCOUNT}`,
          "X-SLURM-USER-TOKEN": `${env.SLURM_API_TOKEN}`,
        },
        next: {
          tags: ["slurm-nodes"],
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch nodes: ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.nodes || !Array.isArray(data.nodes)) {
      console.warn("Invalid nodes data format from Slurm API");
      return { nodes: [], nodeNames: [], last_update: { number: now } };
    }

    // Extract node names for use in power queries
    const nodeNames = data.nodes
      .map((node: any) => node.name || null)
      .filter(Boolean);

    // Ensure data is serializable by doing a safe JSON round-trip
    const serializableNodes = JSON.parse(JSON.stringify(data.nodes));

    // Update cache
    clusterNodesCache = {
      timestamp: now,
      nodes: serializableNodes,
      nodeNames: nodeNames,
    };

    console.log(
      `Refreshed cluster nodes list: ${nodeNames.length} nodes found`
    );

    return {
      nodes: serializableNodes,
      nodeNames,
      last_update: { number: now },
    };
  } catch (error) {
    console.error("Error fetching cluster nodes:", error);
    return { nodes: [], nodeNames: [], last_update: { number: now } };
  }
}

/**
 * Fetch power data from Prometheus using node information
 */
export async function getPowerData() {
  if (!prom) {
    return {
      status: 404,
      data: [],
      summary: {
        currentTotal: 0,
        currentAverage: 0,
        nodesReporting: 0,
        noPrometheusData: true,
      },
    };
  }

  try {
    // Get the list of nodes in the cluster - reuse the cached data if available
    const now = Date.now();
    const { nodeNames: clusterNodes } =
      now - clusterNodesCache.timestamp < CACHE_TTL &&
      clusterNodesCache.nodeNames.length > 0
        ? { nodeNames: clusterNodesCache.nodeNames }
        : await getNodes();

    if (clusterNodes.length === 0) {
      console.warn("No cluster nodes found, proceeding with unfiltered query");
    }

    const currentDate = new Date();
    const twentyFourHoursAgo = new Date(
      currentDate.getTime() - 24 * 60 * 60 * 1000
    );
    const stepSize = 900;

    // First try with the filtered query if we have cluster nodes
    let historicalRes: any = null;
    let powerQuery = "";
    let unfilteredFallback = false;

    if (clusterNodes.length > 0) {
      // Try multiple patterns for node identification
      // Prometheus metrics might store node identifiers in different label names
      const patterns = [
        // Try matching on hostname
        `avg_over_time(ipmi_power_watts{name="Pwr Consumption", hostname=~"${clusterNodes.join(
          "|"
        )}"}[15m])`,
        // Try matching on instance (which might contain hostname)
        `avg_over_time(ipmi_power_watts{name="Pwr Consumption", instance=~"${clusterNodes.join(
          "|"
        )}"}[15m])`,
        // Try matching on node field if exists
        `avg_over_time(ipmi_power_watts{name="Pwr Consumption", node=~"${clusterNodes.join(
          "|"
        )}"}[15m])`,
      ];

      // Try each pattern until we get results
      for (const pattern of patterns) {
        console.log(`Trying power query pattern: ${pattern}`);
        powerQuery = pattern;

        try {
          historicalRes = await prom.rangeQuery(
            powerQuery,
            twentyFourHoursAgo,
            currentDate,
            stepSize
          );

          // Convert to serializable plain object
          historicalRes = JSON.parse(JSON.stringify(historicalRes));

          if (historicalRes?.result?.length) {
            console.log(
              `Found ${historicalRes.result.length} series with pattern: ${pattern}`
            );
            break;
          }
        } catch (error) {
          console.warn(`Pattern failed: ${pattern}`, error);
        }
      }
    }

    // If we still have no results, try unfiltered query as fallback
    if (!historicalRes?.result?.length) {
      console.log(
        "No results with filtered queries, trying unfiltered query as fallback"
      );
      powerQuery =
        'avg_over_time((ipmi_power_watts{name="Pwr Consumption"} or ipmi_dcmi_power_consumption_watts)[15m])';
      unfilteredFallback = true;

      try {
        historicalRes = await prom.rangeQuery(
          powerQuery,
          twentyFourHoursAgo,
          currentDate,
          stepSize
        );

        // Convert to serializable plain object
        historicalRes = JSON.parse(JSON.stringify(historicalRes));
      } catch (error) {
        console.error("Error with unfiltered query:", error);
      }
    }

    // Check if we have any results
    if (!historicalRes?.result?.length) {
      return {
        status: 200,
        data: [],
        summary: {
          currentTotal: 0,
          currentAverage: 0,
          nodesReporting: 0,
          // Important: signal to the frontend that no Prometheus power data was found
          noPrometheusData: true,
        },
      };
    }

    // Log which nodes are included in the results for debugging
    const nodesInResults = new Set<string>();
    historicalRes.result.forEach((series: any) => {
      for (const label of ["hostname", "instance", "node"]) {
        const value = series.metric?.labels?.[label];
        if (value) nodesInResults.add(value);
      }
    });
    console.log(
      `Nodes included in results: ${Array.from(nodesInResults).join(", ")}`
    );

    // If using unfiltered query, check how many of the result nodes are actually in our cluster
    let clusterNodeMatch: string[] = [];
    if (unfilteredFallback && clusterNodes.length > 0) {
      clusterNodeMatch = Array.from(nodesInResults).filter((resultNode) =>
        clusterNodes.some((clusterNode: string) =>
          resultNode.includes(clusterNode)
        )
      );
      console.log(
        `Matched ${clusterNodeMatch.length} nodes to cluster out of ${nodesInResults.size} in unfiltered results`
      );
    }

    const timeSeriesMap = new Map<
      number,
      { totalWatts: number; nodeCount: number }
    >();

    historicalRes.result.forEach((series: any) => {
      // If using unfiltered fallback, check if this series belongs to a cluster node
      if (unfilteredFallback && clusterNodes.length > 0) {
        const nodeInCluster = Object.values(series.metric?.labels || {}).some(
          (label: any) =>
            typeof label === "string" &&
            clusterNodes.some((node: string) => label.includes(node))
        );

        if (!nodeInCluster) {
          return; // Skip this series if it's not for a cluster node
        }
      }

      series.values.forEach((item: any) => {
        const time = item.time;
        const value = item.value;
        const timeKey = Number(time);
        const existing = timeSeriesMap.get(timeKey) || {
          totalWatts: 0,
          nodeCount: 0,
        };

        existing.totalWatts += parseFloat(value.toString());
        existing.nodeCount += 1;
        timeSeriesMap.set(timeKey, existing);
      });
    });

    // Convert Map to Array for serialization
    const timeSeriesData = Array.from(timeSeriesMap.entries())
      .map(([time, { totalWatts, nodeCount }]) => ({
        time,
        watts: Math.round(totalWatts),
        averageWatts: nodeCount ? Math.round(totalWatts / nodeCount) : 0,
        nodesReporting: nodeCount,
      }))
      .sort((a, b) => a.time - b.time)
      .slice(-MAX_DATA_POINTS);

    // Check if we have any processed data
    if (!timeSeriesData.length) {
      return {
        status: 200,
        data: [],
        summary: {
          currentTotal: 0,
          currentAverage: 0,
          nodesReporting: 0,
          noPrometheusData: true,
        },
      };
    }

    const lastPoint = timeSeriesData[timeSeriesData.length - 1];

    return {
      status: 200,
      data: timeSeriesData,
      summary: {
        currentTotal: lastPoint.watts,
        currentAverage: lastPoint.averageWatts,
        nodesReporting: lastPoint.nodesReporting,
        clusterSize: clusterNodes.length,
        unfilteredFallback: unfilteredFallback,
        clusterNodeMatches: clusterNodeMatch?.length || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching power data:", error);
    return {
      status: 500,
      message: "Internal Server Error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Manually trigger revalidation if needed
 */
export async function refreshNodesData() {
  revalidateTag("slurm-nodes");
  // Force cache to be considered stale
  clusterNodesCache.timestamp = 0;
  return getNodes();
}
