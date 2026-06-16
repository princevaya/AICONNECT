// app/api/external-chat/statuses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { deleteStatus } from "@/services/external-chat/status.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureExternalChatUser(userId);
  const { id } = await params;
  await deleteStatus(id, user);
  
  return NextResponse.json({ success: true });
}