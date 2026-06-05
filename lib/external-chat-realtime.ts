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
  reconnectTimer?: ReturnType<typeof setTimeout>;
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

// Helper to check if client is still usable
function isClientConnected(client: Client | null | undefined): client is Client {
  return client !== null && client !== undefined && !(client as any)._ending && !(client as any)._closed;
}

// Singleton client - shared across all connections
let sharedClient: Client | null = null;
let clientInitPromise: Promise<Client> | null = null;

async function getSharedClient(): Promise<Client> {
  if (isClientConnected(sharedClient)) {
    return sharedClient;
  }

  if (clientInitPromise) {
    return clientInitPromise;
  }

  clientInitPromise = (async () => {
    const client = new Client({
      connectionString: normalizedExternalChatConnectionString,
      ssl: resolveExternalChatSslConfig(externalChatForceSsl),
    });
    
    await client.connect();
    
    client.on("error", (err) => {
      console.error("[Realtime] PostgreSQL client error:", err);
      sharedClient = null;
      clientInitPromise = null;
    });
    
    client.on("end", () => {
      sharedClient = null;
      clientInitPromise = null;
    });
    
    sharedClient = client;
    return client;
  })();

  return clientInitPromise;
}

async function getClient() {
  const current = state();
  if (isClientConnected(current.client)) return current.client;
  
  // Use shared client instead of creating new ones
  const shared = await getSharedClient();
  current.client = shared;
  return shared;
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

  try {
    const client = await getClient();
    if (!current.subscribedChannels.has(channel)) {
      await client.query(`LISTEN ${channel}`);
      current.subscribedChannels.add(channel);
    }
  } catch (err) {
    console.error(`[Realtime] Failed to subscribe to ${channel}:`, err);
  }

  return async () => {
    const latest = state();
    const group = latest.listeners.get(channel);
    group?.delete(id);
    if (!group || group.size > 0) return;
    
    latest.listeners.delete(channel);
    if (!latest.client || !latest.subscribedChannels.has(channel)) return;
    
    try {
      await latest.client.query(`UNLISTEN ${channel}`).catch(() => undefined);
      latest.subscribedChannels.delete(channel);
    } catch {
      // Ignore unlisten errors
    }
  };
}

export async function publishRoomEvent(roomCode: string, data: Envelope) {
  try {
    const client = await getClient();
    const channel = roomChannel(roomCode);
    await client.query("SELECT pg_notify($1, $2)", [channel, JSON.stringify(data)]);
  } catch (err) {
    console.error("[Realtime] Failed to publish event:", err);
  }
}

// Track connection attempts to prevent infinite loops
let cleanupInProgress = false;

export async function cleanupRealtimeConnections() {
  if (cleanupInProgress) return;
  cleanupInProgress = true;
  
  try {
    if (sharedClient) {
      try {
        await sharedClient.end();
      } catch {
        // ignore
      }
      sharedClient = null;
    }
    clientInitPromise = null;
    
    const current = state();
    if (current.client) {
      try {
        await current.client.end();
      } catch {
        // ignore
      }
      current.client = undefined;
    }
    current.connectPromise = undefined;
    
    // Clear all listeners
    current.listeners.clear();
    current.subscribedChannels.clear();
    
    if (current.reconnectTimer) {
      clearTimeout(current.reconnectTimer);
      current.reconnectTimer = undefined;
    }
  } finally {
    cleanupInProgress = false;
  }
}

// Handle process exit
if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    cleanupRealtimeConnections();
  });
  process.on("SIGTERM", () => {
    cleanupRealtimeConnections();
  });
  process.on("SIGINT", () => {
    cleanupRealtimeConnections();
  });
}