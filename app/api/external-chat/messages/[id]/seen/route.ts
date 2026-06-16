import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { markSeen } from "@/services/external-chat/chat.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const user = await ensureExternalChatUser(userId);
    await markSeen(id, user);
    return NextResponse.json({ success: true });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to mark seen", status);
  }
}

