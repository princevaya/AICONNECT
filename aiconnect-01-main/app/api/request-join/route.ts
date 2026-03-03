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

  if (!room.pending.includes(name) && !room.approved.includes(name)) {
    room.pending.push(name);
  }
  room.rejected = room.rejected.filter((u) => u !== name);

  return NextResponse.json({ status: "waiting" });
}
