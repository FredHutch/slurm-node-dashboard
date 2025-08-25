export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { env } from "process";
import { NodeState, ClusterStats, ClusterStatusResponse } from "@/types/cluster-status";

async function fetchSlurmData(endpoint: string) {
  const res = await fetch(
    `http://${env.SLURM_SERVER}:6820/slurm/${env.SLURM_API_VERSION}/${endpoint}`,
    {
      headers: {
        "X-SLURM-USER-NAME": `${env.SLURM_API_ACCOUNT}`,
        "X-SLURM-USER-TOKEN": `${env.SLURM_API_TOKEN}`,
      },
      next: {
        revalidate: 30,
      },
    }
  );
  
  if (!res.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${res.status}`);
  }
  
  return res.json();
}

function calculateNodeStates(nodes: any[]): NodeState {
  const nodeStates: NodeState = {
    idle: 0,
    mixed: 0,
    allocated: 0,
    down: 0,
    drain: 0,
    unknown: 0,
  };

  nodes.forEach((node) => {
    const states = Array.isArray(node.state) ? node.state : [node.state];
    const primaryState = states[0]?.toUpperCase();
    const secondaryState = states[1]?.toUpperCase();

    if (primaryState === "IDLE") nodeStates.idle++;
    else if (primaryState === "MIXED") nodeStates.mixed++;
    else if (primaryState === "ALLOCATED") nodeStates.allocated++;
    else if (primaryState === "DOWN") nodeStates.down++;
    else if (primaryState === "UNKNOWN" || secondaryState === "NOT_RESPONDING") nodeStates.unknown++;
    
    if (secondaryState === "DRAIN") nodeStates.drain++;
  });

  return nodeStates;
}

function calculateUtilization(totalCpus: number, allocatedCpus: number): number {
  if (totalCpus === 0) return 0;
  return Math.round((allocatedCpus / totalCpus) * 100);
}

function groupNodesByCluster(nodes: any[]): { [key: string]: any[] } {
  const clusters: { [key: string]: any[] } = {};
  
  nodes.forEach((node) => {
    // Determine cluster based on node hostname or partitions
    let clusterName = "Unknown";
    
    if (node.hostname) {
      if (node.hostname.includes("sol") || node.hostname.includes("gpu")) {
        clusterName = "Sol";
      } else if (node.hostname.includes("phx") || node.hostname.includes("phoenix")) {
        clusterName = "Phoenix";
      }
    }
    
    // Fallback to partitions if hostname doesn't indicate cluster
    if (clusterName === "Unknown" && node.partitions) {
      const partitions = Array.isArray(node.partitions) ? node.partitions : [node.partitions];
      if (partitions.some((p: string) => p.includes("gpu") || p.includes("sol"))) {
        clusterName = "Sol";
      } else if (partitions.some((p: string) => p.includes("phx") || p.includes("phoenix"))) {
        clusterName = "Phoenix";
      }
    }
    
    if (!clusters[clusterName]) {
      clusters[clusterName] = [];
    }
    clusters[clusterName].push(node);
  });
  
  return clusters;
}

function categorizeJobs(jobs: any[]): { running: number; pending: number } {
  let running = 0;
  let pending = 0;
  
  jobs.forEach((job) => {
    const state = Array.isArray(job.job_state) ? job.job_state[0] : job.job_state;
    const stateUpper = state?.toUpperCase();
    
    if (stateUpper === "RUNNING") {
      running++;
    } else if (stateUpper === "PENDING") {
      pending++;
    }
  });
  
  return { running, pending };
}

export async function GET() {
  try {
    // Fetch data from existing SLURM endpoints
    const [nodesData, jobsData] = await Promise.all([
      fetchSlurmData("nodes"),
      fetchSlurmData("jobs")
    ]);

    const nodes = nodesData.nodes || [];
    const jobs = jobsData.jobs || [];
    
    // Group nodes by cluster
    const nodesClusters = groupNodesByCluster(nodes);
    
    // Calculate job statistics
    const jobStats = categorizeJobs(jobs);
    
    const clusters: ClusterStats[] = [];
    let totalNodes = 0;
    let totalUtilization = 0;
    
    Object.entries(nodesClusters).forEach(([clusterName, clusterNodes]) => {
      const nodeStates = calculateNodeStates(clusterNodes);
      
      const totalCpus = clusterNodes.reduce((sum, node) => sum + (node.cpus || 0), 0);
      const allocatedCpus = clusterNodes.reduce((sum, node) => sum + (node.alloc_cpus || 0), 0);
      const totalMemory = clusterNodes.reduce((sum, node) => sum + (node.real_memory || 0), 0);
      const allocatedMemory = clusterNodes.reduce((sum, node) => sum + (node.alloc_memory || 0), 0);
      
      const utilization = calculateUtilization(totalCpus, allocatedCpus);
      
      clusters.push({
        name: clusterName,
        totalNodes: clusterNodes.length,
        utilization,
        nodeStates,
        jobs: {
          // For now, distribute jobs proportionally - in reality, you'd want to track this per cluster
          running: Math.round(jobStats.running * (clusterNodes.length / nodes.length)),
          pending: Math.round(jobStats.pending * (clusterNodes.length / nodes.length))
        },
        resources: {
          totalCpus,
          allocatedCpus,
          totalMemory,
          allocatedMemory
        }
      });
      
      totalNodes += clusterNodes.length;
      totalUtilization += utilization;
    });
    
    const averageUtilization = clusters.length > 0 ? Math.round(totalUtilization / clusters.length) : 0;

    const response: ClusterStatusResponse = {
      timestamp: new Date().toISOString(),
      clusters: clusters.sort((a, b) => a.name.localeCompare(b.name)),
      summary: {
        totalNodes,
        totalJobs: jobStats.running + jobStats.pending,
        averageUtilization
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=30',
      }
    });

  } catch (error) {
    console.error("Error fetching cluster status:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch cluster status",
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
