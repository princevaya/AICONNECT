import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[database] DATABASE_URL is not set. Schedule APIs will fail until it is configured."
  );
}

const createPool = () =>
  new Pool({
    connectionString,
    max: 10,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

const globalPool = globalThis as typeof globalThis & {
  __scheduleDbPool?: Pool;
};

const pool = globalPool.__scheduleDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalPool.__scheduleDbPool = pool;
}

export default pool;
