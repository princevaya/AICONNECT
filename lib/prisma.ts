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

const rawConnectionString = process.env.DATABASE_URL || "";

if (!rawConnectionString) {
  throw new Error("DATABASE_URL must be set.");
}

const connectionString = normalizeConnectionString(rawConnectionString);
const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const forceSsl =
  (process.env.NODE_ENV === "production" && !isLocalhost) ||
  /sslmode=require/i.test(rawConnectionString) ||
  process.env.PGSSLMODE === "require";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaPoolKey?: string;
};

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
    ssl: forceSsl ? { rejectUnauthorized: false } : undefined,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prismaPoolKey = poolKey;
  globalForPrisma.prisma = prisma;
}
