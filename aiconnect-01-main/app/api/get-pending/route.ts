import { NextResponse } from "next/server";
import { rooms } from "@/app/api/_utils/roomStore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  if (!roomId || !rooms[roomId]) {
    return NextResponse.json([]);
  }

  return NextResponse.json(rooms[roomId].pending);
}