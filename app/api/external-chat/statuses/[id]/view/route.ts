// app/api/external-chat/statuses/[id]/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { markStatusViewed } from "@/services/external-chat/status.service";

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
  await markStatusViewed(id, user);
  
  return NextResponse.json({ success: true });
}