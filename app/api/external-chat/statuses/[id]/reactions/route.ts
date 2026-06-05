import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { toggleStatusReaction } from "@/services/external-chat/status.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureExternalChatUser(userId);
    const { id } = await params;
    const body = await request.json();
    
    const { emoji } = body;
    
    if (!emoji?.trim()) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }
    
    const result = await toggleStatusReaction(id, emoji.trim(), user);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[STATUS_REACTIONS_POST]", error);
    const message = error instanceof Error ? error.message : "Failed to update reaction";
    const status = message.includes("Not allowed") ? 403 :
                   message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}