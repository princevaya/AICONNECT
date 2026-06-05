import { NextResponse } from "next/server";
import {
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

  const isApproved = rooms[roomId].approved.includes(name);
  const isRejected = rooms[roomId].rejected.includes(name);

  return NextResponse.json({ approved: isApproved, rejected: isRejected });
}
