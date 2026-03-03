import { NextResponse } from "next/server";
import {
  ensureRoom,
  normalizeParticipantName,
  normalizeRoomId,
} from "@/app/api/_utils/roomStore";

export async function POST(req: Request) {
  const body = await req.json();
  const roomId = typeof body?.roomId === "string" ? normalizeRoomId(body.roomId) : "";
  const name =
    typeof body?.name === "string" ? normalizeParticipantName(body.name) : "";

  if (!roomId || !name) {
    return NextResponse.json({ error: "Room ID and name are required" }, { status: 400 });
  }

  const room = ensureRoom(roomId);

  if (room.settings.isLocked) {
    if (!room.rejected.includes(name)) {
      room.rejected.push(name);
    }
    room.pending = room.pending.filter((u) => u !== name);
    room.approved = room.approved.filter((u) => u !== name);
    return NextResponse.json({ status: "rejected", reason: "locked" });
  }

  if (room.settings.autoApprove) {
    if (!room.approved.includes(name)) {
      room.approved.push(name);
    }
    room.pending = room.pending.filter((u) => u !== name);
    room.rejected = room.rejected.filter((u) => u !== name);
    return NextResponse.json({ status: "approved" });
  }

  if (!room.pending.includes(name) && !room.approved.includes(name)) {
    room.pending.push(name);
  }
  room.rejected = room.rejected.filter((u) => u !== name);

  return NextResponse.json({ status: "waiting" });
}
