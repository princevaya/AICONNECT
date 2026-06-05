import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { listStatuses, createStatus } from "@/services/external-chat/status.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureExternalChatUser(userId);
    const feed = await listStatuses(user);
    
    return NextResponse.json(feed);
  } catch (error) {
    console.error("[STATUS_GET]", error);
    const message = error instanceof Error ? error.message : "Failed to load statuses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureExternalChatUser(userId);
    const body = await request.json();
    
    const { text, visibility, allowedUserIds } = body;
    
    const status = await createStatus({
      actor: user,
      text: text || null,
      visibility: visibility || "public",
      allowedUserIds: allowedUserIds || [],
    });
    
    return NextResponse.json(status);
  } catch (error) {
    console.error("[STATUS_POST]", error);
    const message = error instanceof Error ? error.message : "Failed to create status";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}