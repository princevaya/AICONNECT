import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { EgressInfo, EgressStatus } from "livekit-server-sdk";
import { getEgressClient, mapStatusToLegacyCode } from "@/lib/livekit-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const egressId =
    typeof body?.egressId === "string" ? body.egressId : undefined;

  if (!egressId) {
    return NextResponse.json(
      { error: "egressId is required" },
      { status: 400 }
    );
  }

  const client = getEgressClient();

  try {
    // 1️⃣ Send stop signal (does NOT finalize yet)
    await client.stopEgress(egressId);

    // 2️⃣ Wait until LiveKit finishes encoding & upload
    const finalInfo = await waitForTerminalEgress(client, egressId);

    if (!finalInfo) {
      return NextResponse.json(
        { error: "Recording stop timed out" },
        { status: 504 }
      );
    }

    return NextResponse.json(formatEgressResponse(finalInfo));
  } catch (error) {
    console.error("Failed to stop LiveKit recording", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to stop recording",
      },
      { status: 500 }
    );
  }
}

/* ---------- helpers ---------- */

function formatEgressResponse(info: EgressInfo) {
  return {
    egressId: info.egressId,
    status: EgressStatus[info.status] ?? info.status,
    statusCode: mapStatusToLegacyCode(info.status),
  };
}

async function waitForTerminalEgress(
  client: ReturnType<typeof getEgressClient>,
  egressId: string,
  // Increase timeout to allow LiveKit time to finish encodes and S3 uploads
  timeoutMs = 120_000
): Promise<EgressInfo | null> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const list = await client.listEgress({ egressId });
    const info = list[0];

    if (!info) return null;

    if (
      info.status === EgressStatus.EGRESS_COMPLETE ||
      info.status === EgressStatus.EGRESS_FAILED ||
      info.status === EgressStatus.EGRESS_ABORTED
    ) {
      return info;
    }

    // wait before polling again
    await new Promise((r) => setTimeout(r, 2000));
  }

  return null;
}
