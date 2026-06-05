import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { listCalls, startCall } from "@/services/external-chat/calls.service";
import { parseJson, toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await ensureExternalChatUser(userId);
    const roomCode = req.nextUrl.searchParams.get("roomCode")?.trim();
    if (!roomCode) {
      return NextResponse.json({ error: "roomCode is required" }, { status: 400 });
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
      type?: "audio" | "video";
      participantUserIds?: string[];
    }>(req);
    if (!body?.roomCode?.trim()) {
      return NextResponse.json({ error: "roomCode is required" }, { status: 400 });
    }
    const session = await startCall({
      roomCode: body.roomCode.trim(),
      actor: user,
      type: body.type || "audio",
      participantUserIds: body.participantUserIds || [],
    });
    return NextResponse.json({ call: session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not found") ? 404 : message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to start call", status);
  }
}
