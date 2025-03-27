// app/api/slurm/nodes/route.ts
import { NextResponse } from "next/server";
import { getNodes } from "@/actions/slurm";

export async function GET() {
  // This route maintains backward compatibility with existing code
  // It calls our server action and returns the result in the expected format
  try {
    const nodeData = await getNodes();
    // Return the response in the same format as before
    return NextResponse.json({
      nodes: nodeData.nodes,
      last_update: nodeData.last_update,
    });
  } catch (error) {
    console.error("Error in Slurm nodes route:", error);
    return NextResponse.json(
      { error: "Failed to fetch node data" },
      { status: 500 }
    );
  }
}
