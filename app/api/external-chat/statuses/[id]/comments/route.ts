import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { listStatusComments, createStatusComment } from "@/services/external-chat/status.service";

export const dynamic = "force-dynamic";

export async function GET(
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
    
    const comments = await listStatusComments(id, user);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("[STATUS_COMMENTS_GET]", error);
    const message = error instanceof Error ? error.message : "Failed to load comments";
    const status = message.includes("Not allowed") ? 403 : 
                   message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

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
    
    const { content, parentId } = body;
    
    if (!content?.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }
    
    const comment = await createStatusComment({
      statusId: id,
      viewer: user,
      content: content.trim(),
      parentId: parentId || null,
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error("[STATUS_COMMENTS_POST]", error);
    const message = error instanceof Error ? error.message : "Failed to post comment";
    const status = message.includes("Not allowed") ? 403 :
                   message.includes("not found") ? 404 :
                   message.includes("empty") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}