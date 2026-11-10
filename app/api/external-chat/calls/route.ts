import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { listAllCallsForUser, listCalls, startCall } from "@/services/external-chat/calls.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const roomCode = req.nextUrl.searchParams.get("roomCode")?.trim();
    const scope = req.nextUrl.searchParams.get("scope")?.trim();

    if (scope === "all" || !roomCode) {
      const result = await listAllCallsForUser(user);
      return NextResponse.json(result);
    }

    const result = await listCalls(roomCode, user);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found") ? 404 : message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to load calls", status);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const body = await parseJson<{
      roomCode?: string;
      targetUserId?: string;
      type?: "audio" | "video";
      participantUserIds?: string[];
    }>(req);
    if (!body?.roomCode?.trim() && !body?.targetUserId?.trim()) {
      return NextResponse.json({ error: "roomCode or targetUserId is required" }, { status: 400 });
    }
    const session = await startCall({
      roomCode: body.roomCode?.trim(),
      targetUserId: body.targetUserId?.trim(),
      actor: user,
      type: body.type || "audio",
      participantUserIds: body.participantUserIds || [],
    });
    return NextResponse.json({ call: session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found")
      ? 404
      : message.includes("not allowed") || message.includes("accepted")
        ? 403
        : message.includes("required") || message.includes("eligible")
          ? 400
          : 500;
    return toError(error, "Failed to start call", status);
  }
}
