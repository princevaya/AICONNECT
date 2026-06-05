import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { reportRoom } from "@/services/external-chat/chat.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const body = await parseJson<{ reason: string; description?: string }>(req);
    if (!body?.reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const report = await reportRoom(roomCode, user, body);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to report room", status);
  }
}
