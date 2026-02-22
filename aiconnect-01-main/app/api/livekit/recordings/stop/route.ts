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
    // If already terminal (e.g. ABORTED), stopEgress can return precondition.
    // Treat this as already stopped and continue with status polling.
    try {
      await client.stopEgress(egressId);
    } catch (error) {
      if (!isAlreadyStoppedError(error)) {
        throw error;
      }
    }

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

    await new Promise((r) => setTimeout(r, 2000));
  }

  return null;
}

function isAlreadyStoppedError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { status?: number; code?: string; message?: string };

  if (maybe.status === 412) return true;
  if (typeof maybe.code === "string") {
    if (maybe.code.toLowerCase() === "failed_precondition") return true;
  }
  if (typeof maybe.message === "string") {
    const msg = maybe.message.toLowerCase();
    if (msg.includes("cannot be stopped") || msg.includes("egress_aborted")) {
      return true;
    }
  }

  return false;
}
