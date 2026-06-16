import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { publishRoomEvent, subscribeToRoom, cleanupRealtimeConnections } from "@/lib/external-chat-realtime";
import { assertExternalChatRoomAccess } from "@/services/external-chat/chat.service";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Envelope = { senderId?: string; payload?: unknown };
type UnsubscribeFn = () => Promise<void>;

// Track active connections per room for cleanup
const activeSubscriptions = new Map<string, Set<UnsubscribeFn>>();

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomCode: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { roomCode } = await context.params;
  const user = await ensureExternalChatUser(userId);
  
  // Verify room access
  await assertExternalChatRoomAccess(roomCode, user);

  let unsubscribe: UnsubscribeFn | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const clientId = crypto.randomUUID();
      
      // Send initial connection event
      controller.enqueue(new TextEncoder().encode(`event: ready\ndata: ${JSON.stringify({ clientId, roomCode })}\n\n`));

      // Subscribe to real-time events
      const unsubscribeFn = await subscribeToRoom(roomCode, (message) => {
        if (isClosed) return;
        try {
          const data = `data: ${JSON.stringify(message)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch {
          // Controller may be closed
        }
      });
      unsubscribe = unsubscribeFn;

      // Track this subscription
      if (!activeSubscriptions.has(roomCode)) {
        activeSubscriptions.set(roomCode, new Set());
      }
      const subSet = activeSubscriptions.get(roomCode);
      if (subSet && unsubscribe) {
        subSet.add(unsubscribe);
      }

      // Send heartbeat every 25 seconds
      heartbeatInterval = setInterval(() => {
        if (isClosed) {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return;
        }
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          // Controller closed
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          const currentUnsubscribe = unsubscribe;
          if (currentUnsubscribe) {
            const set = activeSubscriptions.get(roomCode);
            if (set) set.delete(currentUnsubscribe);
            currentUnsubscribe().catch(() => {});
          }
          isClosed = true;
        }
      }, 25000);

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        if (isClosed) return;
        isClosed = true;
        
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        const currentUnsubscribe = unsubscribe;
        if (currentUnsubscribe) {
          const set = activeSubscriptions.get(roomCode);
          if (set) set.delete(currentUnsubscribe);
          if (set && set.size === 0) {
            activeSubscriptions.delete(roomCode);
          }
          currentUnsubscribe().catch(() => {});
        }
        
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    
    cancel() {
      if (isClosed) return;
      isClosed = true;
      
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      
      const currentUnsubscribe = unsubscribe;
      if (currentUnsubscribe) {
        const set = activeSubscriptions.get(roomCode);
        if (set) set.delete(currentUnsubscribe);
        if (set && set.size === 0) {
          activeSubscriptions.delete(roomCode);
        }
        currentUnsubscribe().catch(() => {});
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
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
    
    // Verify room access
    await assertExternalChatRoomAccess(roomCode, user);
    
    const body = (await req.json().catch(() => null)) as Envelope | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    
    // Publish event to the room
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

// Cleanup endpoint for health checks
export async function DELETE() {
  try {
    await cleanupRealtimeConnections();
    
    // Clear all active subscriptions
    for (const [roomCode, subs] of activeSubscriptions) {
      for (const sub of subs) {
        await sub().catch(() => {});
      }
      activeSubscriptions.delete(roomCode);
    }
    
    return NextResponse.json({ cleaned: true });
  } catch (error) {
    return toError(error, "Failed to cleanup connections", 500);
  }
}