import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ensureLocalUser } from "@/services/user.service";

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

  const dbUser = await ensureLocalUser(clerkId);

  try {
    const form = await req.formData();
    const file = form.get("file");
    const roomName = form.get("roomName");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (typeof roomName !== "string" || !roomName.trim()) {
      return NextResponse.json({ error: "roomName is required" }, { status: 400 });
    }

    const safeRoom = sanitize(roomName.trim());
    const safeUser = sanitize(clerkId);
    const extension =
      file.type === "video/mp4"
        ? "mp4"
        : file.type.includes("webm")
        ? "webm"
        : "webm";

    const dirPath = path.join(process.cwd(), "public", "uploads", "recordings");
    await fs.mkdir(dirPath, { recursive: true });

    const timestamp = Date.now();
    const filename = `${safeRoom}-${safeUser}-${timestamp}.${extension}`;
    const filepath = path.join(dirPath, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    const localUrl = `/uploads/recordings/${filename}`;

    // Get or create meeting
    let meeting = await prisma.meeting.findUnique({
      where: { code: roomName },
    });
    if (!meeting) {
      meeting = await prisma.meeting.create({
        data: {
          code: roomName,
          title: `Meeting ${roomName}`,
          date: new Date(),
          scheduledFor: new Date(),
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
        title: `Recording - ${roomName} - ${new Date().toLocaleDateString()}`,
        s3Url: localUrl,
        duration: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ ok: true, key: filename, url: localUrl }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
