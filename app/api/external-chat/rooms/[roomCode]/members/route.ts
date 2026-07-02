import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { addMembers, listMembers } from "@/services/external-chat/chat.service";
import { enforceRateLimit } from "@/services/rate-limit.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const user = await ensureExternalChatUser(userId);
    const members = await listMembers(roomCode, user);
    return NextResponse.json({ members });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to load members", status);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const body = await parseJson<{ memberClerkIds?: string[] }>(req);
    const ids = (body?.memberClerkIds || []).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "memberClerkIds is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const rl = await enforceRateLimit({
      routeKey: "external-chat:group-members-add",
      subjectKey: user.id,
      userId: user.id,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    await addMembers(roomCode, user, ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to add members", status);
  }
}

