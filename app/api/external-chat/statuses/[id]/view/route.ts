import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { markStatusViewed } from "@/services/external-chat/status.service";

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
    
    const result = await markStatusViewed(id, user);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[STATUS_VIEW_POST]", error);
    const message = error instanceof Error ? error.message : "Failed to mark status as viewed";
    const status = message.includes("Not allowed") ? 403 :
                   message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}