// prisma.config.ts
import { defineConfig, env } from 'prisma/config';
import 'dotenv/config'; // Make sure you have dotenv installed

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
