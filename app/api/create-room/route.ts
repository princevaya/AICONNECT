import { NextResponse } from "next/server";
import { ensureRoom } from "@/app/api/_utils/roomStore";
import { createMeeting } from "@/lib/meetings";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { userId } = await auth();
    const roomId = crypto.randomUUID();

    try {
      await createMeeting({
        code: roomId,
        title: "Instant Meeting",
        scheduledFor: new Date(),
        attendees: [],
        createdBy: userId ?? null,
        status: "Live",
        allowJoinBeforeHost: true,
        waitingRoom: false,
        enableChat: true,
        allowScreenSharing: true,
      });
    } catch (dbErr) {
      console.warn("Failed to persist instant meeting to DB (proceeding in-memory):", dbErr);
    }

    ensureRoom(roomId);

    return NextResponse.json({
      roomId,
      link: `/meeting/join?room=${roomId}`,
    });
  } catch (error) {
    console.error("POST /api/create-room error:", error);
    const roomId = crypto.randomUUID();
    ensureRoom(roomId);
    return NextResponse.json({
      roomId,
      link: `/meeting/join?room=${roomId}`,
    });
  }
}
