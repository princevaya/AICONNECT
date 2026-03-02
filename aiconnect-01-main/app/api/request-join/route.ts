import { NextResponse } from "next/server";
import { rooms } from "@/app/api/_utils/roomStore";

export async function POST(req: Request) {
  const body = await req.json();

  const roomId = body.roomId || body.room;
  const name = body.name || body.username;

  console.log("JOIN REQUEST:", roomId, name);

  if (!rooms[roomId]) {
  rooms[roomId] = {
    hostCreatedAt: new Date(),
    pending: [],
    approved: [],
  };
}
  rooms[roomId].pending.push(name);

  console.log("ROOM STATE:", rooms[roomId]);

  return NextResponse.json({ status: "waiting" });
}