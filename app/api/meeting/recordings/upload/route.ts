import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ensureLocalUser } from "@/services/user.service";
import { findByCode } from "@/lib/meetings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const roomName = form.get("roomName");
    const rawDuration = form.get("duration");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "Recording file is empty (0 bytes)" }, { status: 400 });
    }
    if (typeof roomName !== "string" || !roomName.trim()) {
      return NextResponse.json({ error: "roomName is required" }, { status: 400 });
    }

    const cleanRoomName = roomName.trim();
    const durationSec = Math.max(0, Math.round(Number(rawDuration || 0) || 0));
    const safeRoom = sanitize(cleanRoomName);
    const safeUser = sanitize(clerkId);
    const extension = file.type === "video/mp4" ? "mp4" : "webm";

    const dirPath = path.join(process.cwd(), "public", "uploads", "recordings");
    await fs.mkdir(dirPath, { recursive: true });

    const timestamp = Date.now();
    const filename = `${safeRoom}-${safeUser}-${timestamp}.${extension}`;
    const filepath = path.join(dirPath, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    const localUrl = `/uploads/recordings/${filename}`;
    const streamUrl = `/api/meeting/recordings/stream/${filename}`;

    const meetingRoom = await findByCode(cleanRoomName).catch(() => null);
    const displayTitle = `${meetingRoom?.title || `Meeting ${cleanRoomName}`} · ${new Date(
      timestamp
    ).toLocaleDateString()}`;

    // Always write lightweight metadata sidecar so recordings remain recoverable if DB is unreachable
    await fs
      .writeFile(
        `${filepath}.meta.json`,
        JSON.stringify(
          {
            key: filename,
            roomName: cleanRoomName,
            clerkId,
            title: displayTitle,
            duration: durationSec,
            sizeBytes: buffer.length,
            createdAt: timestamp,
          },
          null,
          2
        ),
        "utf8"
      )
      .catch(() => undefined);

    let dbSaved = false;
    let dbWarning: string | null = null;

    try {
      const dbUser = await ensureLocalUser(clerkId);

      // Get or create meeting row in `meetings` table for Recording FK
      let meeting = await prisma.meeting.findUnique({
        where: { code: cleanRoomName },
      });
      if (!meeting) {
        meeting = await prisma.meeting.create({
          data: {
            code: cleanRoomName,
            title: meetingRoom?.title || `Meeting ${cleanRoomName}`,
            date: new Date(),
            scheduledFor: meetingRoom?.scheduledFor || new Date(),
            startTime: new Date(),
            endTime: new Date(Date.now() + 60 * 60 * 1000),
            durationMins: 60,
          },
        });
      }

      // Save to database with 30-day expiration
      await prisma.recording.create({
        data: {
          meetingId: meeting.id,
          userId: dbUser.id,
          title: displayTitle,
          s3Url: localUrl,
          duration: durationSec,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      dbSaved = true;
    } catch (dbErr) {
      dbWarning = dbErr instanceof Error ? dbErr.message : "Database save failed";
      console.warn("[recordings/upload] saved to disk with metadata sidecar; DB insert skipped:", dbWarning);
    }

    return NextResponse.json(
      {
        ok: true,
        key: filename,
        url: streamUrl,
        localUrl,
        streamUrl,
        downloadUrl: `${streamUrl}?download=1`,
        dbSaved,
        warning: dbWarning,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
