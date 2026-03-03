import { NextResponse } from "next/server";
import { ensureRoom, normalizeRoomId } from "@/app/api/_utils/roomStore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawRoomId = searchParams.get("roomId");
  const roomId = rawRoomId ? normalizeRoomId(rawRoomId) : "";

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const room = ensureRoom(roomId);
  return NextResponse.json({ settings: room.settings });
}

export async function POST(req: Request) {
  const body = await req.json();
  const roomId = typeof body?.roomId === "string" ? normalizeRoomId(body.roomId) : "";
  const autoApprove = Boolean(body?.autoApprove);
  const isLocked = Boolean(body?.isLocked);

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const room = ensureRoom(roomId);
  room.settings.autoApprove = autoApprove;
  room.settings.isLocked = isLocked;

  if (room.settings.isLocked) {
    for (const name of room.pending) {
      if (!room.rejected.includes(name)) {
        room.rejected.push(name);
      }
    }
    room.pending = [];
  } else if (room.settings.autoApprove) {
    for (const name of room.pending) {
      if (!room.approved.includes(name)) {
        room.approved.push(name);
      }
    }
    room.pending = [];
  }

  return NextResponse.json({ status: "updated", settings: room.settings });
}
