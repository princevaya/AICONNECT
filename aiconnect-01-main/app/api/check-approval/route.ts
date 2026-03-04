import { NextResponse } from "next/server";
import {
  ensureRoom,
  normalizeParticipantName,
  normalizeRoomId,
  rooms,
} from "@/app/api/_utils/roomStore";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawRoomId = searchParams.get("roomId");
  const rawName = searchParams.get("name");
  const roomId = rawRoomId ? normalizeRoomId(rawRoomId) : "";
  const name = rawName ? normalizeParticipantName(rawName) : "";

  if (!roomId || !name || !rooms[roomId]) {
    return NextResponse.json({ approved: false, rejected: false });
  }

  const room = ensureRoom(roomId);
  const isApproved = room.approved.includes(name);
  const isRejected = room.rejected.includes(name);

  return NextResponse.json({ approved: isApproved, rejected: isRejected });
}
