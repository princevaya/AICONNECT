import { Pool } from "pg";

const rawConnectionString = process.env.DATABASE_URL;

function normalizeConnectionString(connectionString?: string) {
  if (!connectionString) return connectionString;

  try {
    const parsed = new URL(connectionString);
    const isSupabase = /supabase\.(co|com)/i.test(parsed.hostname);
    const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();

    // pg-connection-string v2 currently treats sslmode=require as verify-full.
    // For Supabase app connections, opt into libpq-compatible require semantics.
    if (isSupabase && sslMode === "require" && !parsed.searchParams.has("uselibpqcompat")) {
      parsed.searchParams.set("uselibpqcompat", "true");
      return parsed.toString();
    }
  } catch {
    // Keep original value if URL parsing fails.
  }

  return connectionString;
}

const connectionString = normalizeConnectionString(rawConnectionString);

if (!connectionString) {
  console.warn(
    "[database] DATABASE_URL is not set. Schedule APIs will fail until it is configured."
  );
}

const createPool = () =>
  new Pool({
    connectionString,
    max: 10,
    ssl: (() => {
      if (!connectionString) return undefined;

      const forceSsl =
        /supabase\.(co|com)/i.test(connectionString) ||
        /sslmode=require/i.test(connectionString) ||
        process.env.PGSSLMODE === "require" ||
        process.env.NODE_ENV === "production";

      return forceSsl ? { rejectUnauthorized: false } : undefined;
    })(),
  });

const globalPool = globalThis as typeof globalThis & {
  __scheduleDbPool?: Pool;
};

const pool = globalPool.__scheduleDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalPool.__scheduleDbPool = pool;
}

export default pool;
