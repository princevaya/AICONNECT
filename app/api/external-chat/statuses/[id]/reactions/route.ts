// app/api/external-chat/statuses/[id]/reactions/route.ts - ADD GET HANDLER

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { toggleStatusReaction, getStatusReactions } from "@/services/external-chat/status.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureExternalChatUser(userId);
  const { id } = await params;
  const reactions = await getStatusReactions(id, user);
  
  return NextResponse.json({ reactions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureExternalChatUser(userId);
  const { id } = await params;
  const { emoji } = await req.json();
  
  const result = await toggleStatusReaction(id, emoji, user);
  return NextResponse.json(result);
}