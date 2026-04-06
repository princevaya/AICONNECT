import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { generateInviteCode } from "@/services/external-chat/chat.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const user = await ensureExternalChatUser(userId);
    const rl = await enforceRateLimit({
      routeKey: "external-chat:group-invite-generate",
      subjectKey: user.id,
      userId: user.id,
      limit: 10,
      windowMs: 60_000,
    });
    if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    const result = await generateInviteCode(roomCode, user);
    return NextResponse.json(result);
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to generate invite code", status);
  }
}
