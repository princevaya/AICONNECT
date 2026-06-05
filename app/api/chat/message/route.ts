import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createMessage } from "@/services/chat.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";
    const content = typeof body?.content === "string" ? body.content : "";
    const fileId = typeof body?.fileId === "string" ? body.fileId : undefined;

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    const user = await ensureLocalUser(userId);
    const message = await createMessage({
      roomCode: roomId,
      sender: user,
      content,
      fileId,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chat/message failed", error);
    const message = error instanceof Error ? error.message : "Failed to send message";
    const status =
      message.toLowerCase().includes("not found")
        ? 404
        : message.toLowerCase().includes("not valid")
          ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
