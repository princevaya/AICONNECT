import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

async function cleanupExpiredRecordings() {
  try {
    const expired = await prisma.recording.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    for (const rec of expired) {
      if (rec.s3Url && rec.s3Url.startsWith("/uploads/")) {
        const relativePath = rec.s3Url.replace(/^\//, "");
        const filePath = path.join(process.cwd(), "public", relativePath);
        await fs.unlink(filePath).catch(() => undefined);
        await fs.unlink(`${filePath}.meta.json`).catch(() => undefined);
      }
      await prisma.recording.delete({
        where: { id: rec.id },
      });
    }
  } catch (error) {
    console.warn("Expired recording cleanup skipped:", error instanceof Error ? error.message : error);
  }
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger cleanup asynchronously
  cleanupExpiredRecordings().catch(() => undefined);

  const roomFilter = req.nextUrl.searchParams.get("room") || undefined;
  const recordingsDir = path.join(process.cwd(), "public", "uploads", "recordings");
  const safeUserToken = `-${sanitize(clerkId)}-`;

  const results: Array<{
    id: string;
    egressId: string;
    roomName: string;
    status: string;
    statusCode: number;
    startedAt: number;
    endedAt: number;
    updatedAt: number;
    durationSeconds: number;
    filename: string;
    sizeBytes: number;
    downloadUrl: string | null;
    streamUrl: string | null;
    storageLocation: string;
  }> = [];

  const seenDiskFilenames = new Set<string>();

  // 1. Load canonical DB recordings (if DB tables exist)
  try {
    const dbUser = await ensureLocalUser(clerkId);
    const recordings = await prisma.recording.findMany({
      where: {
        userId: dbUser.id,
        meeting: roomFilter ? { code: roomFilter } : undefined,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      include: { meeting: true },
      orderBy: { createdAt: "desc" },
    });

    for (const rec of recordings) {
      const startedAt = rec.createdAt.getTime();
      let durationSeconds = rec.duration || 0;
      let sizeBytes = 0;

      const isLocal = Boolean(rec.s3Url && rec.s3Url.startsWith("/uploads/"));
      const streamFilename = isLocal ? path.basename(rec.s3Url) : "";
      if (isLocal && streamFilename) {
        const filePath = path.join(process.cwd(), "public", rec.s3Url.replace(/^\//, ""));
        try {
          const stats = await fs.stat(filePath);
          sizeBytes = stats.size;
          seenDiskFilenames.add(streamFilename);
          if (!durationSeconds) {
            const metaRaw = await fs.readFile(`${filePath}.meta.json`, "utf8").catch(() => null);
            if (metaRaw) {
              const meta = JSON.parse(metaRaw) as { duration?: number };
              if (meta?.duration) durationSeconds = Number(meta.duration) || 0;
            }
          }
        } catch {
          // Local file may have been removed; keep entry only if external URL exists
        }
      }

      const endedAt = startedAt + durationSeconds * 1000;
      const streamUrl =
        isLocal && streamFilename ? `/api/meeting/recordings/stream/${streamFilename}` : rec.s3Url;
      const downloadUrl =
        isLocal && streamFilename
          ? `/api/meeting/recordings/stream/${streamFilename}?download=1`
          : rec.s3Url;

      results.push({
        id: rec.id,
        egressId: rec.id,
        roomName: rec.meeting.code,
        status: "EGRESS_COMPLETE",
        statusCode: 3,
        startedAt,
        endedAt,
        updatedAt: startedAt,
        durationSeconds,
        filename: rec.title,
        sizeBytes,
        downloadUrl,
        streamUrl,
        storageLocation: "local",
      });
    }
  } catch (error) {
    console.warn(
      "[livekit/recordings] DB query failed, falling back to local recording scan:",
      error instanceof Error ? error.message : error
    );
  }

  // 2. Scan public/uploads/recordings for any user-owned files not yet synced into DB
  try {
    const entries = await fs.readdir(recordingsDir).catch(() => [] as string[]);
    for (const entry of entries) {
      if (!/\.(webm|mp4)$/i.test(entry)) continue;
      if (seenDiskFilenames.has(entry)) continue;
      if (!entry.includes(safeUserToken)) continue;

      const filePath = path.join(recordingsDir, entry);
      const stats = await fs.stat(filePath).catch(() => null);
      if (!stats || !stats.isFile() || stats.size <= 0) continue;

      let roomName = entry.split(safeUserToken)[0] || "meeting";
      let title = `Recording - ${roomName}`;
      let durationSeconds = 0;
      let startedAt = stats.birthtimeMs || stats.mtimeMs || Date.now();

      const suffixPart = entry.split(safeUserToken)[1] || "";
      const tsMatch = suffixPart.match(/^(\d+)\.(webm|mp4)$/i);
      if (tsMatch) {
        const parsedTs = Number(tsMatch[1]);
        if (Number.isFinite(parsedTs) && parsedTs > 0) startedAt = parsedTs;
      }

      const metaRaw = await fs.readFile(`${filePath}.meta.json`, "utf8").catch(() => null);
      if (metaRaw) {
        try {
          const meta = JSON.parse(metaRaw) as {
            roomName?: string;
            title?: string;
            duration?: number;
            createdAt?: number;
          };
          if (meta.roomName) roomName = meta.roomName;
          if (meta.title) title = meta.title;
          if (typeof meta.duration === "number") durationSeconds = meta.duration;
          if (typeof meta.createdAt === "number") startedAt = meta.createdAt;
        } catch {
          // Ignore invalid sidecar JSON
        }
      }

      if (roomFilter && roomName !== roomFilter) continue;

      const streamUrl = `/api/meeting/recordings/stream/${entry}`;
      results.push({
        id: entry,
        egressId: entry,
        roomName,
        status: "EGRESS_COMPLETE",
        statusCode: 3,
        startedAt,
        endedAt: startedAt + durationSeconds * 1000,
        updatedAt: startedAt,
        durationSeconds,
        filename: title,
        sizeBytes: stats.size,
        downloadUrl: `${streamUrl}?download=1`,
        streamUrl,
        storageLocation: "local",
      });
    }
  } catch (fsErr) {
    console.warn("Failed to scan local recordings directory:", fsErr);
  }

  results.sort((a, b) => b.startedAt - a.startedAt);
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const roomName = typeof body?.roomName === "string" ? body.roomName : undefined;

    if (!roomName) {
      return NextResponse.json(
        { error: "A valid roomName is required" },
        { status: 400 }
      );
    }

    // Return a mock active egress to allow browser recording
    return NextResponse.json({
      egressId: `mock-egress-${Date.now()}`,
      status: "EGRESS_ACTIVE",
      statusCode: 1, // ACTIVE
      message: "Recording started. WebM browser capture active.",
    });
  } catch (error) {
    console.error("Failed to start mock recording", error);
    return NextResponse.json(
      { error: "Failed to start recording" },
      { status: 500 }
    );
  }
}
