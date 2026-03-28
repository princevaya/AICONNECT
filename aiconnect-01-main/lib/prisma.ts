import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

function normalizeConnectionString(connectionString?: string) {
  if (!connectionString) return connectionString;

  try {
    const parsed = new URL(connectionString);
    const isSupabase = /supabase\.(co|com)/i.test(parsed.hostname);
    const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();

    if (isSupabase && sslMode === "require" && !parsed.searchParams.has("uselibpqcompat")) {
      parsed.searchParams.set("uselibpqcompat", "true");
      return parsed.toString();
    }
  } catch {
    // Keep original value if URL parsing fails.
  }

  return connectionString;
}

function createPrismaClient() {
  const connectionString = normalizeConnectionString(process.env.DATABASE_URL);
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set.");
  }

  const isSupabaseConnection = /supabase\.co/i.test(connectionString);
  const forceSsl =
    isSupabaseConnection ||
    process.env.NODE_ENV === "production" ||
    /sslmode=require/i.test(connectionString) ||
    process.env.PGSSLMODE === "require";

  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString,
      max: 10,
      ssl: forceSsl ? { rejectUnauthorized: false } : undefined,
    });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
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
