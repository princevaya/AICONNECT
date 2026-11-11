import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureRoom, normalizeRoomId } from "@/app/api/_utils/roomStore";

export async function GET(req: Request) {
  const { userId } = await auth().catch(() => ({ userId: null }));
  const { searchParams } = new URL(req.url);
  const rawRoomId = searchParams.get("roomId");
  const roomId = rawRoomId ? normalizeRoomId(rawRoomId) : "";

  if (!roomId) {
    return NextResponse.json({ pending: [] });
  }

  const room = ensureRoom(roomId, userId);

  return NextResponse.json({
    pending: room.pending,
  });
}
