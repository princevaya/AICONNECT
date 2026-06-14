import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  EgressInfo,
  EgressStatus,
  S3Upload,
} from "livekit-server-sdk";
import { setRecordingOwner } from "@/lib/recording-ownership";


import {
  getEgressClient,
  isActiveEgressStatus,
  mapStatusToLegacyCode,
} from "@/lib/livekit-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM_NAME_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

interface RecordingResponse {
  id: string;
  egressId: string;
  roomName: string;
  status: string;
  statusCode?: number;
  startedAt?: number;
  endedAt?: number;
  updatedAt?: number;
  durationSeconds?: number;
  filename?: string;
  sizeBytes?: number;
  downloadUrl?: string | null;
  streamUrl?: string | null;
  storageLocation?: string;
}

type LiveKitFileInfo = EgressInfo["fileResults"][number];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getEgressClient();
    const roomFilter = req.nextUrl.searchParams.get("room") || undefined;
    const recordings = await client.listEgress(
      roomFilter ? { roomName: roomFilter } : undefined
    );

    const normalized = await Promise.all(
      recordings.map((info) => normalizeEgressInfo(info))
    );

    normalized.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Failed to list LiveKit recordings", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const roomName =
    typeof body?.roomName === "string" ? body.roomName : undefined;

  if (!roomName || !ROOM_NAME_REGEX.test(roomName)) {
    return NextResponse.json(
      { error: "A valid roomName is required" },
      { status: 400 }
    );
  }

  try {
    const client = getEgressClient();

    const activeRecordings = await client.listEgress({
      roomName,
      active: true,
    });

    const existing = activeRecordings.find((info) =>
      isActiveEgressStatus(info.status)
    );

    if (existing) {
      return NextResponse.json({
        egressId: existing.egressId,
        status: EgressStatus[existing.status] ?? existing.status,
        statusCode: mapStatusToLegacyCode(existing.status),
        message: "Recording already running",
      });
    }

    const fileOutput = buildFileOutput(roomName);
    const info = await client.startRoomCompositeEgress(roomName, fileOutput, {
      layout: "grid",
      encodingOptions: EncodingOptionsPreset.H264_1080P_30,
      // Ensure we capture both audio and video (explicitly set)
      audioOnly: false,
      videoOnly: false,
    });

    setRecordingOwner(info.egressId, userId);

    return NextResponse.json({
      egressId: info.egressId,
      status: EgressStatus[info.status] ?? info.status,
      statusCode: mapStatusToLegacyCode(info.status),
    });
  } catch (error) {
    console.error("Failed to start LiveKit recording", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start recording",
      },
      { status: 500 }
    );
  }
}

async function normalizeEgressInfo(
  info: EgressInfo
): Promise<RecordingResponse> {
  const fileInfo = pickFileInfo(info);
  const startedAt = fileInfo?.startedAt
    ? toMs(fileInfo.startedAt)
    : toMs(info.startedAt);
  const endedAt = fileInfo?.endedAt
    ? toMs(fileInfo.endedAt)
    : toMs(info.endedAt);
  const updatedAt = toMs(info.updatedAt);
  const durationSeconds = normalizeDuration(
    fileInfo?.duration,
    startedAt,
    endedAt
  );
  const downloadUrl = await buildDownloadUrl(fileInfo);
  const sizeBytes = fileInfo?.size ? bigIntToNumber(fileInfo.size) : undefined;

  const resolvedStartedAt =
    startedAt ?? inferStartedAt(endedAt, durationSeconds);
  const resolvedEndedAt = endedAt ?? inferEndedAt(startedAt, durationSeconds);

  return {
    id: info.egressId,
    egressId: info.egressId,
    roomName: info.roomName,
    status: EgressStatus[info.status] ?? "UNKNOWN",
    statusCode: mapStatusToLegacyCode(info.status),
    startedAt: resolvedStartedAt,
    endedAt: resolvedEndedAt,
    updatedAt,
    durationSeconds,
    filename: fileInfo?.filename,
    sizeBytes,
    downloadUrl,
    streamUrl: downloadUrl,
    storageLocation: fileInfo?.location,
  };
}

function pickFileInfo(info: EgressInfo): LiveKitFileInfo | undefined {
  if (info.fileResults && info.fileResults.length > 0) {
    return info.fileResults[0];
  }

  if (info.result?.case === "file") {
    return info.result.value;
  }

  return undefined;
}

function toMs(value?: bigint) {
  if (!value || value === BigInt(0)) {
    return undefined;
  }

  const abs = value < BigInt(0) ? value * BigInt(-1) : value;

  const ONE_SECOND_THRESHOLD = BigInt(1_000_000_000_000); // 1e12
  const ONE_MILLISECOND_THRESHOLD = BigInt(1_000_000_000_000_000); // 1e15
  const ONE_MICROSECOND_THRESHOLD = BigInt(1_000_000_000_000_000_000); // 1e18

  if (abs < ONE_SECOND_THRESHOLD) {
    return Number(value) * 1000;
  }

  if (abs < ONE_MILLISECOND_THRESHOLD) {
    return Number(value);
  }

  if (abs < ONE_MICROSECOND_THRESHOLD) {
    return Number(value / BigInt(1000));
  }

  return Number(value / BigInt(1_000_000));
}

function normalizeDuration(
  duration?: bigint,
  startedAt?: number,
  endedAt?: number
) {
  const derivedFromTimestamps = deriveDurationFromTimestamps(
    startedAt,
    endedAt
  );
  if (derivedFromTimestamps !== undefined) {
    return derivedFromTimestamps;
  }

  return convertProtoDurationToSeconds(duration);
}

function inferStartedAt(endedAt?: number, durationSeconds?: number) {
  if (!endedAt || !durationSeconds) {
    return undefined;
  }

  const value = endedAt - durationSeconds * 1000;
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function inferEndedAt(startedAt?: number, durationSeconds?: number) {
  if (!startedAt || !durationSeconds) {
    return undefined;
  }

  const value = startedAt + durationSeconds * 1000;
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function deriveDurationFromTimestamps(startedAt?: number, endedAt?: number) {
  if (!startedAt || !endedAt) {
    return undefined;
  }

  const delta = endedAt - startedAt;
  if (!Number.isFinite(delta) || delta <= 0) {
    return undefined;
  }

  return Math.round(delta / 1000);
}

function convertProtoDurationToSeconds(duration?: bigint) {
  if (!duration || duration <= BigInt(0)) {
    return undefined;
  }

  const asNumber = Number(duration);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    if (asNumber >= 1_000_000_000) {
      return Math.round(asNumber / 1_000_000_000);
    }
    if (asNumber >= 1_000_000) {
      return Math.round(asNumber / 1_000_000);
    }
    if (asNumber >= 10_000) {
      return Math.round(asNumber / 1000);
    }
    return Math.round(asNumber);
  }

  const billion = BigInt(1_000_000_000);
  if (duration >= billion) {
    return Number(duration / billion);
  }

  const million = BigInt(1_000_000);
  if (duration >= million) {
    return Number(duration / million);
  }

  const thousand = BigInt(1_000);
  if (duration >= thousand) {
    return Number(duration / thousand);
  }

  return Number(duration);
}

function bigIntToNumber(value?: bigint) {
  if (!value || value === BigInt(0)) {
    return undefined;
  }

  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : undefined;
}

async function buildDownloadUrl(file?: LiveKitFileInfo) {
  if (!file) {
    return null;
  }

  // Fallback: return the raw HTTP URL if it's already public
  if (file.location?.startsWith("http")) {
    return file.location;
  }

  return null;
}

function buildFileOutput(roomName: string): EncodedFileOutput {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = `recordings/${roomName}/${timestamp}.mp4`;

  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
  });
}
