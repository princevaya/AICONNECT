// app/api/external-chat/statuses/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { createStatusComment, listStatusComments } from "@/services/external-chat/status.service";

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
  const comments = await listStatusComments(id, user);
  
  return NextResponse.json({ comments });
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
  const { content } = await req.json();
  
  const comment = await createStatusComment({
    statusId: id,
    viewer: user,
    content,
  });
  
  return NextResponse.json({ comment });
}