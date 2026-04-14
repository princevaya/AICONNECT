import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { publishRoomEvent, subscribeToRoom } from "@/lib/external-chat-realtime";
import { assertExternalChatRoomAccess } from "@/services/external-chat/chat.service";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Envelope = { senderId?: string; payload?: unknown };

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  let unsubscribe: (() => Promise<void>) | null = null;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { roomCode } = await context.params;
    const user = await ensureExternalChatUser(userId);
    await assertExternalChatRoomAccess(roomCode, user);

    const stream = new ReadableStream<string>({
      async start(controller) {
        const clientId = crypto.randomUUID();
        controller.enqueue(`event: ready\ndata: ${JSON.stringify({ clientId })}\n\n`);

        unsubscribe = await subscribeToRoom(roomCode, (message) => {
          controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
        });

        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(": keep-alive\n\n");
          } catch {
            clearInterval(keepAlive);
          }
        }, 20_000);

        req.signal.addEventListener("abort", () => {
          clearInterval(keepAlive);
          void unsubscribe?.();
        });
      },
      async cancel() {
        await unsubscribe?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return toError(error, "Failed to connect realtime", 500);
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
    const user = await ensureExternalChatUser(userId);
    await assertExternalChatRoomAccess(roomCode, user);
    const body = (await req.json().catch(() => null)) as Envelope | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    await publishRoomEvent(roomCode, {
      senderId: user.id,
      payload: body.payload,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const status = message.includes("not allowed") ? 403 : 500;
    return toError(error, "Failed to publish realtime event", status);
  }
}
