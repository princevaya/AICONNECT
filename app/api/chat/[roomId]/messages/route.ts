import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { listMessages } from "@/services/chat.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSchemaNotReady(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("table") && message.includes("does not exist")
  ) || (message.includes("relation") && message.includes("does not exist"));
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await context.params;
    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    const user = await ensureLocalUser(userId);
    const messages = await listMessages({ roomCode: roomId, viewer: user });
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/chat/[roomId]/messages failed", error);
    if (isSchemaNotReady(error)) {
      return NextResponse.json({ messages: [], setupRequired: true });
    }
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
