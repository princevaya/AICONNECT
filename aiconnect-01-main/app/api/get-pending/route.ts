import { NextResponse } from "next/server";
import { ensureRoom, normalizeRoomId } from "@/app/api/_utils/roomStore";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawRoomId = searchParams.get("roomId");
  const roomId = rawRoomId ? normalizeRoomId(rawRoomId) : "";

  if (!roomId) {
    return NextResponse.json({ pending: [] });
  }

  const room = ensureRoom(roomId);

  return NextResponse.json({
    pending: room.pending,
  });
}
