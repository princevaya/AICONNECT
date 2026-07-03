import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function normalizeConnectionString(input: string) {
  let value = input.trim();

  if (value.startsWith("DATABASE_URL=")) {
    value = value.slice("DATABASE_URL=".length);
  }

  value = value.replace(/^["']|["']$/g, "");

  try {
    const url = new URL(value);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    return value
      .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert)=[^&]*/gi, "$1")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaPoolKey?: string;
};

function createPrismaClient() {
  const primaryConnectionString = process.env.DATABASE_URL || "";
  const fallbackConnectionString = process.env.CHAT_DATABASE_URL || "";
  const rawConnectionString = primaryConnectionString || fallbackConnectionString;

  if (!rawConnectionString) {
    throw new Error("DATABASE_URL or CHAT_DATABASE_URL must be set.");
  }

  const connectionString = normalizeConnectionString(rawConnectionString);
  const isSupabaseConnection = /supabase\.(co|com)/i.test(rawConnectionString);
  const isLocalHost = /(?::\/\/|@)(?:localhost|127\.0\.0\.1|db)(?::|\/)/i.test(rawConnectionString);
  const forceSsl =
    (isSupabaseConnection ||
      (process.env.NODE_ENV === "production" && !isLocalHost) ||
      /sslmode=require/i.test(rawConnectionString) ||
      process.env.PGSSLMODE === "require") &&
    !/sslmode=disable/i.test(rawConnectionString);

  const poolKey = JSON.stringify({
    connectionString,
    forceSsl,
  });

  if (globalForPrisma.prismaPool && globalForPrisma.prismaPoolKey !== poolKey) {
    void globalForPrisma.prismaPool.end().catch(() => undefined);
    globalForPrisma.prismaPool = undefined;
    globalForPrisma.prisma = undefined;
  }

  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5000,
      ssl: forceSsl ? { rejectUnauthorized: false } : undefined,
    });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prismaPoolKey = poolKey;
    globalForPrisma.prisma = client;
  }

  return client;
}

function getPrismaClient() {
  return globalForPrisma.prisma ?? createPrismaClient();
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});