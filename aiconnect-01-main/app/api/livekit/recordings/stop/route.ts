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
    const info = await client.stopEgress(egressId);
    return NextResponse.json(formatEgressResponse(info));
  } catch (error) {
    console.error("Failed to stop LiveKit recording", error);

    if (isTerminalStatusError(error)) {
      const resolved = await resolveExistingEgress(client, egressId);
      if (resolved) {
        return NextResponse.json({
          ...resolved,
          message: "Recording already finalized",
        });
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to stop recording",
      },
      { status: 500 }
    );
  }
}

function formatEgressResponse(info: EgressInfo) {
  return {
    egressId: info.egressId,
    status: EgressStatus[info.status] ?? info.status,
    statusCode: mapStatusToLegacyCode(info.status),
  };
}

function isTerminalStatusError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const err = error as { code?: string; status?: number; message?: string };
  const message = err.message || "";

  if (err.code === "failed_precondition" || err.status === 412) {
    return (
      message.includes("cannot be stopped") ||
      message.includes("EGRESS_COMPLETE") ||
      message.includes("EGRESS_ABORTED")
    );
  }

  return false;
}

async function resolveExistingEgress(
  client: ReturnType<typeof getEgressClient>,
  egressId: string
) {
  try {
    const existing = await client.listEgress({ egressId });
    const info = existing[0];
    return info ? formatEgressResponse(info) : null;
  } catch (error) {
    console.error("Failed to resolve LiveKit egress state", error);
    return null;
  }
}
