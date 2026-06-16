import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { removeMember, transferOwnership, changeMemberRole } from "@/services/external-chat/chat.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const body = await parseJson<{ targetUserId: string }>(req);
    if (!body?.targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const rl = await enforceRateLimit({
      routeKey: "external-chat:group-members-remove",
      subjectKey: user.id,
      userId: user.id,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    await removeMember(roomCode, user, body.targetUserId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to remove member", status);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const body = await parseJson<{
      action: "transfer" | "changeRole";
      targetUserId?: string;
      newRole?: string;
    }>(req);
    if (!body?.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const rl = await enforceRateLimit({
      routeKey: "external-chat:group-members-manage",
      subjectKey: user.id,
      userId: user.id,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

    if (body.action === "transfer") {
      if (!body.targetUserId) {
        return NextResponse.json({ error: "targetUserId is required for transfer" }, { status: 400 });
      }
      await transferOwnership(roomCode, user, body.targetUserId);
      return NextResponse.json({ success: true });
    }

    if (body.action === "changeRole") {
      if (!body.targetUserId || !body.newRole) {
        return NextResponse.json({ error: "targetUserId and newRole are required" }, { status: 400 });
      }
      await changeMemberRole(roomCode, user, body.targetUserId, body.newRole);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to update member", status);
  }
}
