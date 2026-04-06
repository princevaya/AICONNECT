import { NextResponse } from "next/server";
import { ensureRoom } from "@/app/api/_utils/roomStore";
export async function POST() {
  const roomId = crypto.randomUUID();

  ensureRoom(roomId);

  return NextResponse.json({
    roomId,
    link: `http://localhost:3000/meeting/join?room=${roomId}`,
  });
}
