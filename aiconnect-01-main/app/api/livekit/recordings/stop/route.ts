import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { EgressInfo, EgressStatus } from "livekit-server-sdk";
import { getEgressClient, mapStatusToLegacyCode } from "@/lib/livekit-server";
import {
  clearRecordingOwner,
  getRecordingOwner,
} from "@/lib/recording-ownership";

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
    const knownOwner = getRecordingOwner(egressId);
    if (knownOwner && knownOwner !== userId) {
      return NextResponse.json(
        { error: "Only the user who started this recording can stop it." },
        { status: 403 }
      );
    }

    if (!knownOwner) {
      const list = await client.listEgress({ egressId });
      const info = list[0];
      const inferredOwner = inferOwnerFromEgress(info);
      if (inferredOwner && inferredOwner !== userId) {
        return NextResponse.json(
          { error: "Only the user who started this recording can stop it." },
          { status: 403 }
        );
      }
    }

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

    clearRecordingOwner(egressId);
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

function inferOwnerFromEgress(info?: EgressInfo) {
  if (!info) return undefined;
  const fileResult =
    (info.fileResults && info.fileResults.length > 0
      ? info.fileResults[0]
      : undefined) ??
    (info.result?.case === "file" ? info.result.value : undefined);
  const location = fileResult?.location;
  if (!location) return undefined;

  const s3Prefix = "s3://";
  if (location.startsWith(s3Prefix)) {
    const noScheme = location.slice(s3Prefix.length);
    const slash = noScheme.indexOf("/");
    if (slash === -1) return undefined;
    const key = noScheme.slice(slash + 1);
    const parts = key.split("/").filter(Boolean);
    if (parts[0] === "meeting" && parts[1] === "recordings" && parts[2]) {
      return parts[2];
    }
  }

  return undefined;
}
