import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeStorageFile, storageRelativePath } from "@/lib/local-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const extension =
      file.type === "video/mp4"
        ? "mp4"
        : file.type.includes("webm")
        ? "webm"
        : "webm";
    const buffer = Buffer.from(await file.arrayBuffer());

    let meeting = await prisma.meeting.findUnique({
      where: { code: safeRoom },
    });

    if (!meeting) {
      meeting = await prisma.meeting.create({
        data: {
          code: safeRoom,
          title: `Meeting ${safeRoom}`,
          date: new Date(),
          scheduledFor: new Date(),
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          durationMins: 60,
        },
      });
    }

    const relativePath = storageRelativePath("recordings", `${Date.now()}-ui-recording.${extension}`);
    await writeStorageFile(relativePath, buffer);

    const recording = await prisma.recording.create({
      data: {
        meetingId: meeting.id,
        title: file.name || `recording.${extension}`,
        filePath: relativePath,
      },
    });

    const url = `/api/meeting/recordings/download?id=${recording.id}`;

    return NextResponse.json({ ok: true, key: relativePath, url }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
