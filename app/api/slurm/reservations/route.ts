import { NextResponse } from "next/server";
import { env } from "process";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const res = await fetch(
    `http://${env.SLURM_SERVER}:6820/slurm/${env.SLURM_API_VERSION}/reservations`,
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
  const data = await res.json();

  return NextResponse.json(data);
}
