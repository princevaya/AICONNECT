import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RealtimeEnvelope = {
  senderId?: string;
  payload?: unknown;
};

type RoomClients = Map<string, ReadableStreamDefaultController<string>>;

declare global {
  // eslint-disable-next-line no-var
  var __aiconnectRealtimeRooms: Map<string, RoomClients> | undefined;
}

function getRoomsStore() {
  if (!globalThis.__aiconnectRealtimeRooms) {
    globalThis.__aiconnectRealtimeRooms = new Map<string, RoomClients>();
  }
  return globalThis.__aiconnectRealtimeRooms;
}

function getRoomClients(roomId: string) {
  const store = getRoomsStore();
  let room = store.get(roomId);
  if (!room) {
    room = new Map<string, ReadableStreamDefaultController<string>>();
    store.set(roomId, room);
  }
  return room;
}

function broadcast(roomId: string, message: RealtimeEnvelope) {
  const room = getRoomClients(roomId);
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  for (const [clientId, controller] of room.entries()) {
    try {
      controller.enqueue(payload);
    } catch {
      room.delete(clientId);
    }
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const clientId = crypto.randomUUID();
  const room = getRoomClients(roomId);

  const stream = new ReadableStream<string>({
    start(controller) {
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        room.delete(clientId);
        if (room.size === 0) {
          getRoomsStore().delete(roomId);
        }

        try {
          controller.close();
        } catch {
          // Stream may already be closed when client disconnects abruptly.
        }
      };

      room.set(clientId, controller);
      controller.enqueue(`event: ready\ndata: ${JSON.stringify({ clientId })}\n\n`);

      const keepAlive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(": keep-alive\n\n");
        } catch {
          cleanup();
        }
      }, 20000);

      req.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      room.delete(clientId);
      if (room.size === 0) {
        getRoomsStore().delete(roomId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;

  try {
    const body = (await req.json()) as RealtimeEnvelope;
    broadcast(roomId, body);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
}
