import { NextResponse } from "next/server";
import { rooms } from "@/app/api/_utils/roomStore";
export async function POST() {
  const roomId = crypto.randomUUID();

  rooms[roomId] = {
    hostCreatedAt: new Date(),
    pending: [],
    approved: [],
    rejected: [],
    settings: {
      autoApprove: false,
      isLocked: false,
    },
  };

  return NextResponse.json({
    roomId,
    link: `http://localhost:3000/meeting/join?room=${roomId}`,
  });
}