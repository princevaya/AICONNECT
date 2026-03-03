import { NextResponse } from "next/server";
import { normalizeRoomId, rooms } from "@/app/api/_utils/roomStore";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawRoomId = searchParams.get("roomId");
  const roomId = rawRoomId ? normalizeRoomId(rawRoomId) : "";

  if (!roomId || !rooms[roomId]) {
    return NextResponse.json({ pending: [] });
  }

  return NextResponse.json({
    pending: rooms[roomId].pending,
  });
}
