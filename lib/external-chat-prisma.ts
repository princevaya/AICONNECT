// lib/external-chat-prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const rawConnectionString = process.env.CHAT_DATABASE_URL || process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error("CHAT_DATABASE_URL or DATABASE_URL must be set.");
}

export function normalizeExternalChatConnectionString(input: string) {
  let value = input.trim();

  if (value.startsWith("CHAT_DATABASE_URL=")) {
    value = value.slice("CHAT_DATABASE_URL=".length);
  }

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
    const isSupabasePooler = /pooler\.supabase\.com$/i.test(url.hostname);
    
    // For Supabase pooler, ensure the username has the project ref
    if (isSupabasePooler && !url.username.includes(".")) {
      const projectRefFromEnv =
        process.env.CHAT_SUPABASE_PROJECT_REF ||
        process.env.SUPABASE_PROJECT_REF ||
        "";
      const projectRefFromPrimaryDb = (() => {
        const primary = process.env.DATABASE_URL || "";
        const match = primary.match(/db\.([a-z0-9]+)\.supabase\.co/i);
        return match?.[1] || "";
      })();
      // Use the project ref from the URL or environment
      const projectRef = projectRefFromEnv || projectRefFromPrimaryDb || "eyvlqlinptvpqkmdmdvq";
      if (projectRef) {
        url.username = `${url.username}.${projectRef}`;
      }
    }

    // Don't delete sslmode - Supabase requires it
    // Remove only problematic params that cause issues with Prisma
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    
    // Ensure correct port for pooler (6543 for pgbouncer)
    if (url.hostname.includes("pooler.supabase.com")) {
      if (url.port === "5432" || url.port === "") {
        url.port = "6543";
      }
      // Ensure pgbouncer=true is set for pooler
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
    }
    
    // Ensure connect_timeout is set
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    
    return url.toString();
  } catch {
    // Fallback for malformed strings: strip SSL params with regex
    const stripped = value
      .replace(/([?&])(sslcert|sslkey|sslrootcert)=[^&]*/gi, "$1")
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
      // Ignore bad cert reads and continue with next candidate.
    }
  }

  // For Supabase, we need to accept self-signed certificates
  return { rejectUnauthorized: false };
}

export const normalizedExternalChatConnectionString = normalizeExternalChatConnectionString(rawConnectionString);

const isSupabaseConnection = /supabase\.(co|com)/i.test(rawConnectionString);
const isLocalHost = /(?::\/\/|@)(?:localhost|127\.0\.0\.1|db)(?::|\/)/i.test(rawConnectionString);
const forceSsl =
  (isSupabaseConnection ||
    (process.env.NODE_ENV === "production" && !isLocalHost) ||
    /sslmode=require/i.test(rawConnectionString) ||
    process.env.PGSSLMODE === "require") &&
  !/sslmode=disable/i.test(rawConnectionString);

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
  void globalForPrisma.externalChatPool.end().catch(() => undefined);
  globalForPrisma.externalChatPool = undefined;
  globalForPrisma.externalChatPrisma = undefined;
}

const pool =
  globalForPrisma.externalChatPool ??
  new Pool({
    connectionString: normalizedExternalChatConnectionString,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    ssl: resolveExternalChatSslConfig(forceSsl),
  });

const adapter = new PrismaPg(pool);

export const externalChatPrisma =
  globalForPrisma.externalChatPrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.externalChatPool = pool;
  globalForPrisma.externalChatPoolKey = poolKey;
  globalForPrisma.externalChatPrisma = externalChatPrisma;
}