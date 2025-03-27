// app/api/slurm/power/route.ts
import { NextResponse } from "next/server";
import { getPowerData } from "@/actions/slurm";

export async function GET() {
  try {
    const powerData = await getPowerData();
    return NextResponse.json(powerData);
  } catch (error) {
    console.error("Error in Slurm power route:", error);
    return NextResponse.json(
      { error: "Failed to fetch power data" },
      { status: 500 }
    );
  }
}
