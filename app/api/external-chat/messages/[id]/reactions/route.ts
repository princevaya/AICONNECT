import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { toggleReaction } from "@/services/external-chat/chat.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const body = await parseJson<{ emoji?: string }>(req);
    const emoji = body?.emoji?.trim() || "";
    if (!emoji) return NextResponse.json({ error: "emoji is required" }, { status: 400 });
    const user = await ensureExternalChatUser(userId);
    const result = await toggleReaction(id, emoji, user);
    return NextResponse.json(result);
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to toggle reaction", status);
  }
}

