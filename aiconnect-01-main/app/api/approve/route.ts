import { NextResponse } from "next/server";
import {
  ensureRoom,
  normalizeParticipantName,
  normalizeRoomId,
} from "@/app/api/_utils/roomStore";

export async function POST(req: Request) {
  const body = await req.json();
  const roomId = typeof body?.roomId === "string" ? normalizeRoomId(body.roomId) : "";
  const name =
    typeof body?.name === "string" ? normalizeParticipantName(body.name) : "";
  const action = body?.action;

  if (!roomId) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const room = ensureRoom(roomId);

  if (action === "all") {
    const toApprove = room.pending;
    room.approved = Array.from(new Set([...room.approved, ...toApprove]));
    room.pending = [];
    return NextResponse.json({ status: "approved_all", approvedCount: toApprove.length });
  }

  if (!name) {
    return NextResponse.json({ error: "Name is required for this action" }, { status: 400 });
  }

  if (action === "reject") {
    room.pending = room.pending.filter((u) => u !== name);
    if (!room.rejected.includes(name)) {
      room.rejected.push(name);
    }
    return NextResponse.json({ status: "rejected" });
  }

  if (!room.approved.includes(name)) {
    room.approved.push(name);
  }
  room.pending = room.pending.filter((u) => u !== name);

  return NextResponse.json({ status: "approved" });
}
