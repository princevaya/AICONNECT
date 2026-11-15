
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv();
loadEnv({ path: ".env.local", override: true });

const databaseUrl =
  process.env.INTERVIEW_DIRECT_URL ??
  process.env.INTERVIEW_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("INTERVIEW_DIRECT_URL is missing in .env.local");
}

export default defineConfig({
  schema: "./interview/schema.prisma",
  migrations: {
    path: "./interview/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});