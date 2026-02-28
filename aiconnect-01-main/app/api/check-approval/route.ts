import { NextResponse } from "next/server";
import { rooms } from "@/app/api/_utils/roomStore";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const name = searchParams.get("name");

  if (!roomId || !rooms[roomId]) {
    return NextResponse.json({ approved: false });
  }

  const isApproved = rooms[roomId].approved.includes(name || "");

  return NextResponse.json({ approved: isApproved });
}