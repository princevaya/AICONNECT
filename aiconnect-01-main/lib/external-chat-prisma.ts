import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const rawConnectionString = process.env.CHAT_DATABASE_URL;
if (!rawConnectionString) {
  throw new Error("CHAT_DATABASE_URL must be set.");
}

export function normalizeExternalChatConnectionString(input: string) {
  let value = input.trim();

  if (value.startsWith("CHAT_DATABASE_URL=")) {
    value = value.slice("CHAT_DATABASE_URL=".length);
  }

  value = value.replace(/^["']|["']$/g, "");

  const protoIndex = value.search(/postgres(?:ql)?:\/\//i);
  if (protoIndex > 0) {
    value = value.slice(protoIndex);
  }

  try {
    const url = new URL(value);
    const isSupabasePooler = /pooler\.supabase\.com$/i.test(url.hostname);
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
      const projectRef = projectRefFromEnv || projectRefFromPrimaryDb;
      if (projectRef) {
        url.username = `${url.username}.${projectRef}`;
      }
    }

    // Prevent libpq SSL params from overriding explicit Pool ssl config.
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    // Fallback for malformed strings: strip SSL params with regex.
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
      // Ignore bad cert reads and continue with next candidate.
    }
  }

  return { rejectUnauthorized: false };
}

export const normalizedExternalChatConnectionString = normalizeExternalChatConnectionString(rawConnectionString);

const isSupabaseConnection = /supabase\.(co|com)/i.test(rawConnectionString);
const forceSsl =
  isSupabaseConnection ||
  process.env.NODE_ENV === "production" ||
  /sslmode=/i.test(rawConnectionString) ||
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
  void globalForPrisma.externalChatPool.end().catch(() => undefined);
  globalForPrisma.externalChatPool = undefined;
  globalForPrisma.externalChatPrisma = undefined;
}

const pool =
  globalForPrisma.externalChatPool ??
  new Pool({
    connectionString: normalizedExternalChatConnectionString,
    max: 10,
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
