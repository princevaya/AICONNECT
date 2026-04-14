import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { joinByInviteCode, previewInviteCode } from "@/services/external-chat/chat.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const inviteCode = req.nextUrl.searchParams.get("inviteCode")?.trim() || "";
    if (!inviteCode) {
      return NextResponse.json({ error: "inviteCode is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const result = await previewInviteCode(inviteCode, user);
    return NextResponse.json(result);
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") || m.includes("invalid") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to preview invite code", status);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await parseJson<{ inviteCode: string }>(req);
    if (!body?.inviteCode) {
      return NextResponse.json({ error: "inviteCode is required" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const result = await joinByInviteCode(body.inviteCode, user);
    return NextResponse.json(result);
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to join with invite code", status);
  }
}
