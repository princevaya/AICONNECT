import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        try {
          await fs.unlink(filePath);
        } catch {
          // File might not exist, ignore
        }
      }
      await prisma.recording.delete({
        where: { id: rec.id },
      });
    }
  } catch (error) {
    console.error("Failed to clean up expired recordings:", error);
  }
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger cleanup asynchronously
  cleanupExpiredRecordings().catch((err) =>
    console.error("Async recording cleanup failed:", err)
  );

  try {
    const dbUser = await ensureLocalUser(clerkId);

    const roomFilter = req.nextUrl.searchParams.get("room") || undefined;

    const recordings = await prisma.recording.findMany({
      where: {
        userId: dbUser.id,
        meeting: roomFilter ? { code: roomFilter } : undefined,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      include: {
        meeting: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const normalized = await Promise.all(
      recordings.map(async (rec) => {
        const startedAt = rec.createdAt.getTime();
        const endedAt = startedAt + (rec.duration || 0) * 1000;
        
        let sizeBytes = 0;
        if (rec.s3Url && rec.s3Url.startsWith("/uploads/")) {
          const relativePath = rec.s3Url.replace(/^\//, "");
          const filePath = path.join(process.cwd(), "public", relativePath);
          try {
            const stats = await fs.stat(filePath);
            sizeBytes = stats.size;
          } catch {
            // File might not exist
          }
        }

        const streamFilename = path.basename(rec.s3Url);
        const streamUrl = rec.s3Url.startsWith("/uploads/")
          ? `/api/meeting/recordings/stream/${streamFilename}`
          : rec.s3Url;

        return {
          id: rec.id,
          egressId: rec.id,
          roomName: rec.meeting.code,
          status: "EGRESS_COMPLETE",
          statusCode: 3, // COMPLETE
          startedAt,
          endedAt,
          updatedAt: startedAt,
          durationSeconds: rec.duration || 0,
          filename: rec.title,
          sizeBytes,
          downloadUrl: rec.s3Url,
          streamUrl,
          storageLocation: "local",
        };
      })
    );

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Failed to list recordings", error);
    return NextResponse.json([]);
  }
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
