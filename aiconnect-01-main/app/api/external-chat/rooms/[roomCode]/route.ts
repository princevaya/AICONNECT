import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { deleteRoom, updateRoom, archiveRoom } from "@/services/external-chat/chat.service";
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
    const user = await ensureExternalChatUser(userId);
    const rl = await enforceRateLimit({
      routeKey: "external-chat:group-room-delete",
      subjectKey: user.id,
      userId: user.id,
      limit: 8,
      windowMs: 60_000,
    });
    if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    await deleteRoom(roomCode, user);
    return NextResponse.json({ success: true });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to delete room", status);
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
      name?: string;
      description?: string;
      avatarUrl?: string;
      isPrivate?: boolean;
      isDiscoverable?: boolean;
      archive?: boolean;
    }>(req);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const user = await ensureExternalChatUser(userId);
    const rl = await enforceRateLimit({
      routeKey: "external-chat:group-room-update",
      subjectKey: user.id,
      userId: user.id,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

    if (body.archive !== undefined) {
      const room = await archiveRoom(roomCode, user, body.archive);
      return NextResponse.json({ room });
    }

    const room = await updateRoom(roomCode, user, {
      name: body.name,
      description: body.description,
      avatarUrl: body.avatarUrl,
      isPrivate: body.isPrivate,
      isDiscoverable: body.isDiscoverable,
    });
    return NextResponse.json({ room });
  } catch (error) {
    const m = error instanceof Error ? error.message.toLowerCase() : "";
    const status = m.includes("not found") ? 404 : m.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to update room", status);
  }
}
