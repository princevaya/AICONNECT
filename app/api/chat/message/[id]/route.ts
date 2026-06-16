import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { deleteMessage } from "@/services/chat.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "message id is required" }, { status: 400 });
    }

    const user = await ensureLocalUser(userId);
    await deleteMessage({ messageId: id, requester: user });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/chat/message/[id] failed", error);
    const message = error instanceof Error ? error.message : "Delete failed";
    const status = message.toLowerCase().includes("not allowed") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

