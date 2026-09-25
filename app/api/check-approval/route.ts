import { NextResponse } from "next/server";
import {
  ensureRoom,
  normalizeParticipantName,
  normalizeRoomId,
  rooms,
} from "@/app/api/_utils/roomStore";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawRoomId = searchParams.get("roomId");
  const rawName = searchParams.get("name");
  const roomId = rawRoomId ? normalizeRoomId(rawRoomId) : "";
  const name = rawName ? normalizeParticipantName(rawName) : "";

  if (!roomId || !name) {
    return NextResponse.json({ approved: false, rejected: false });
  }

  const room = ensureRoom(roomId);

  if (room.settings?.isLocked) {
    return NextResponse.json({ approved: false, rejected: true });
  }

  if (room.settings?.autoApprove) {
    return NextResponse.json({ approved: true, rejected: false });
  }

  const isApproved = room.approved.includes(name);
  const isRejected = room.rejected.includes(name);

  return NextResponse.json({ approved: isApproved, rejected: isRejected });
}
