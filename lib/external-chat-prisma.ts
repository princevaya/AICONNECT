import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const rawConnectionString = process.env.DATABASE_URL || "";

if (!rawConnectionString) {
  console.error("[External Chat] No database URL found. Please set DATABASE_URL.");
}

export function normalizeExternalChatConnectionString(input: string | undefined) {
  if (!input) return "";
  
  let value = input.trim();

  if (value.startsWith("DATABASE_URL=")) {
    value = value.slice("DATABASE_URL=".length);
  }

  value = value.replace(/^["']|["']$/g, "");

  const protoIndex = value.search(/postgres(?:ql)?:\/\//i);
  if (protoIndex > 0) {
    value = value.slice(protoIndex);
  }

  try {
    const url = new URL(value);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    
    // Add statement timeout to prevent long-running queries
    if (!url.searchParams.has("statement_timeout")) {
      url.searchParams.set("statement_timeout", "30000");
    }
    
    return url.toString();
  } catch (error) {
    console.error("[External Chat] Failed to parse connection string:", error);
    const stripped = value
      .replace(/([?&])(sslmode|sslcert|sslkey|sslrootcert)=[^&]*/gi, "$1")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
    return stripped;
  }
}

export function resolveExternalChatSslConfig(forceSslEnabled: boolean) {
  if (!forceSslEnabled) return undefined;

  const certCandidates = [
    process.env.CHAT_DATABASE_SSL_ROOT_CERT,
    process.env.PGSSLROOTCERT,
    path.join(process.cwd(), "certs", "root.crt"),
    path.join(process.cwd(), "cert", "root.crt"),
  ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));

  for (const candidate of certCandidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      return {
        rejectUnauthorized: true,
        ca: fs.readFileSync(candidate, "utf8"),
      };
    } catch {
      // Ignore bad cert reads
    }
  }

  return { rejectUnauthorized: false };
}

export const normalizedExternalChatConnectionString = rawConnectionString ? normalizeExternalChatConnectionString(rawConnectionString) : "";

const forceSsl =
  process.env.NODE_ENV === "production" ||
  (rawConnectionString && /sslmode=/i.test(rawConnectionString)) ||
  process.env.PGSSLMODE === "require";

export const externalChatForceSsl = forceSsl;

const globalForPrisma = globalThis as unknown as {
  externalChatPrisma?: PrismaClient;
  externalChatPool?: Pool;
  externalChatPoolKey?: string;
};

const poolKey = JSON.stringify({
  connectionString: normalizedExternalChatConnectionString,
  forceSsl,
  cert: process.env.CHAT_DATABASE_SSL_ROOT_CERT || process.env.PGSSLROOTCERT || "",
});

if (globalForPrisma.externalChatPool && globalForPrisma.externalChatPoolKey !== poolKey) {
  try {
    globalForPrisma.externalChatPool.end().catch(() => undefined);
  } catch {
    // ignore
  }
  globalForPrisma.externalChatPool = undefined;
  globalForPrisma.externalChatPrisma = undefined;
}

let pool: Pool;
let adapter: PrismaPg | undefined;
let prismaClient: PrismaClient;

if (normalizedExternalChatConnectionString) {
  try {
    // REDUCED pool size - critical fix for connection exhaustion
    pool =
      globalForPrisma.externalChatPool ??
      new Pool({
        connectionString: normalizedExternalChatConnectionString,
        max: 8,           // Reduced from 20 to 8 to prevent connection exhaustion
        min: 2,           // Keep 2 connections ready
        idleTimeoutMillis: 5000,     // Close idle connections faster (5 seconds)
        connectionTimeoutMillis: 10000,
        allowExitOnIdle: true,
        ssl: resolveExternalChatSslConfig(forceSsl),
      });

    adapter = new PrismaPg(pool);

    prismaClient =
      globalForPrisma.externalChatPrisma ??
      new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
  } catch (error) {
    console.error("[External Chat] Failed to create database connection:", error);
    prismaClient = new PrismaClient();
    pool = new Pool({ max: 1 });
    adapter = undefined;
  }
} else {
  console.warn("[External Chat] No database connection string found. External chat features will be unavailable.");
  prismaClient = new PrismaClient();
  pool = new Pool({ max: 1 });
  adapter = undefined;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.externalChatPool = pool;
  globalForPrisma.externalChatPoolKey = poolKey;
  globalForPrisma.externalChatPrisma = prismaClient;
}

export const externalChatPrisma = prismaClient;