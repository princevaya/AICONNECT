import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  leaveParticipant,
  listParticipants,
  removeParticipantByHost,
  upsertParticipant,
} from "@/services/chat.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSchemaNotReady(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("table") && message.includes("does not exist")
  ) || (message.includes("relation") && message.includes("does not exist"));
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await context.params;
    const user = await ensureLocalUser(userId);
    const result = await listParticipants({ roomCode: roomId, requester: user });
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/chat/[roomId]/participants failed", error);
    if (isSchemaNotReady(error)) {
      return NextResponse.json({ roomId: "", participants: [], isHost: false, setupRequired: true });
    }
    return NextResponse.json({ error: "Failed to load participants" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await context.params;
    const body = await req.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "join";
    const user = await ensureLocalUser(userId);

    if (action === "leave") {
      await leaveParticipant({ roomCode: roomId, user });
      return NextResponse.json({ success: true });
    }

    await upsertParticipant({
      roomCode: roomId,
      user,
      micStatus: typeof body?.micStatus === "boolean" ? body.micStatus : true,
      cameraStatus: typeof body?.cameraStatus === "boolean" ? body.cameraStatus : true,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/chat/[roomId]/participants failed", error);
    if (isSchemaNotReady(error)) {
      return NextResponse.json({ success: true, setupRequired: true });
    }
    return NextResponse.json({ error: "Failed to update participant status" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await context.params;
    const body = await req.json().catch(() => null);
    const participantId =
      typeof body?.participantId === "string" ? body.participantId : "";
    if (!participantId) {
      return NextResponse.json({ error: "participantId is required" }, { status: 400 });
    }

    const host = await ensureLocalUser(userId);
    await removeParticipantByHost({ roomCode: roomId, host, participantId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/chat/[roomId]/participants failed", error);
    const message = error instanceof Error ? error.message : "Failed to remove participant";
    const status = message.toLowerCase().includes("only active host") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
