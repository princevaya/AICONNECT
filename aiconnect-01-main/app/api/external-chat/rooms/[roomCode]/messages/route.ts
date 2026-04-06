import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { createMessage, listMessages } from "@/services/external-chat/chat.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const user = await ensureExternalChatUser(userId);
    const search = req.nextUrl.searchParams.get("search") || undefined;
    const pinnedOnly = req.nextUrl.searchParams.get("pinned") === "1";
    const before = req.nextUrl.searchParams.get("before") || undefined;
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") || "60");
    const limit = Number.isFinite(limitRaw) ? limitRaw : 60;
    const result = await listMessages({
      roomCode,
      viewer: user,
      search,
      pinnedOnly,
      before,
      limit,
    });
    return NextResponse.json(result);
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to load messages", status);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const body = await parseJson<{
      content?: string;
      type?: "text" | "note" | "poll";
      replyToId?: string;
      attachmentId?: string;
      privateToUserIds?: string[];
      noteColor?: "amber" | "emerald" | "sky" | "rose" | "violet";
      poll?: { question: string; options: string[] } | null;
    }>(req);

    const user = await ensureExternalChatUser(userId);
    const rateLimit = await enforceRateLimit({
      routeKey: "external-chat:message-create",
      subjectKey: user.id,
      userId: user.id,
      limit: Number(process.env.EXTERNAL_CHAT_MESSAGES_PER_MINUTE || 40),
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Message rate limit exceeded" }, { status: 429 });
    }
    const message = await createMessage({
      roomCode,
      sender: user,
      content: body?.content || "",
      type: body?.type,
      replyToId: body?.replyToId || null,
      attachmentId: body?.attachmentId || null,
      privateToUserIds: body?.privateToUserIds || [],
      noteColor: body?.noteColor || "amber",
      poll: body?.poll || null,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status =
      m.includes("cannot be empty") || m.includes("not found")
        ? 400
        : m.includes("not allowed")
          ? 403
          : 500;
    return toError(error, "Failed to send message", status);
  }
}

