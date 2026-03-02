import { NextResponse } from "next/server";
import { rooms } from "@/app/api/_utils/roomStore";

export async function POST(req: Request) {

  const { roomId, name } = await req.json();

  if (!rooms[roomId]) {

    return NextResponse.json(
      { error: "Room not found" },
      { status: 404 }
    );

  }

  // add to approved
  if (!rooms[roomId].approved.includes(name)) {
    rooms[roomId].approved.push(name);
  }

  // remove from pending
  rooms[roomId].pending =
    rooms[roomId].pending.filter(
      user => user !== name
    );

  console.log("APPROVED:", name);

  return NextResponse.json({
    success: true
  });

}