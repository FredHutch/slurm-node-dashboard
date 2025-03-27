import { NextResponse } from "next/server";
import { getPowerData } from "@/actions/slurm";

export async function GET() {
  // This route simply calls our server action and returns the result
  // This maintains backward compatibility with existing code
  const powerData = await getPowerData();
  return NextResponse.json(powerData);
}
