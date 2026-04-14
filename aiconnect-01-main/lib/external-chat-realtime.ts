import { createHash, randomUUID } from "crypto";
import { Client } from "pg";
import {
  externalChatForceSsl,
  normalizedExternalChatConnectionString,
  resolveExternalChatSslConfig,
} from "@/lib/external-chat-prisma";

type Envelope = { senderId?: string; payload?: unknown };
type Listener = (message: Envelope) => void;

type GlobalState = {
  client?: Client;
  connectPromise?: Promise<Client>;
  listeners: Map<string, Map<string, Listener>>;
  subscribedChannels: Set<string>;
};

const globalState = globalThis as typeof globalThis & {
  __externalChatRealtimeState?: GlobalState;
};

function state() {
  if (!globalState.__externalChatRealtimeState) {
    globalState.__externalChatRealtimeState = {
      listeners: new Map(),
      subscribedChannels: new Set(),
    };
  }
  return globalState.__externalChatRealtimeState;
}

function roomChannel(roomCode: string) {
  return `ec_room_${createHash("sha256").update(roomCode).digest("hex").slice(0, 32)}`;
}

async function getClient() {
  const current = state();
  if (current.client) return current.client;
  if (current.connectPromise) return current.connectPromise;

  current.connectPromise = (async () => {
    const client = new Client({
      connectionString: normalizedExternalChatConnectionString,
      ssl: resolveExternalChatSslConfig(externalChatForceSsl),
    });
    await client.connect();
    client.on("notification", (msg) => {
      const channel = msg.channel;
      const raw = msg.payload || "";
      const bucket = state().listeners.get(channel);
      if (!bucket || bucket.size === 0) return;
      try {
        const payload = JSON.parse(raw) as Envelope;
        for (const listener of bucket.values()) {
          listener(payload);
        }
      } catch {
        // Ignore malformed realtime payloads.
      }
    });
    client.on("error", () => {
      const currentState = state();
      currentState.client = undefined;
      currentState.connectPromise = undefined;
      currentState.subscribedChannels.clear();
    });
    current.client = client;
    current.connectPromise = undefined;
    return client;
  })();

  return current.connectPromise;
}

export async function subscribeToRoom(roomCode: string, listener: Listener) {
  const channel = roomChannel(roomCode);
  const current = state();
  const id = randomUUID();
  let bucket = current.listeners.get(channel);
  if (!bucket) {
    bucket = new Map();
    current.listeners.set(channel, bucket);
  }
  bucket.set(id, listener);

  const client = await getClient();
  if (!current.subscribedChannels.has(channel)) {
    await client.query(`LISTEN ${channel}`);
    current.subscribedChannels.add(channel);
  }

  return async () => {
    const latest = state();
    const group = latest.listeners.get(channel);
    group?.delete(id);
    if (!group || group.size > 0) return;
    latest.listeners.delete(channel);
    if (!latest.client || !latest.subscribedChannels.has(channel)) return;
    await latest.client.query(`UNLISTEN ${channel}`).catch(() => undefined);
    latest.subscribedChannels.delete(channel);
  };
}

export async function publishRoomEvent(roomCode: string, data: Envelope) {
  const client = await getClient();
  const channel = roomChannel(roomCode);
  await client.query("SELECT pg_notify($1, $2)", [channel, JSON.stringify(data)]);
}
