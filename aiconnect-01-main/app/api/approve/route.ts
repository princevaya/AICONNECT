import { NextResponse } from "next/server";
import { rooms } from "@/app/api/_utils/roomStore";

export async function POST(req: Request) {
  const { roomId, name } = await req.json();

  if (!rooms[roomId]) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  rooms[roomId].approved.push(name);
  rooms[roomId].pending = rooms[roomId].pending.filter(
    (u) => u !== name
  );

  return NextResponse.json({ status: "approved" });
}