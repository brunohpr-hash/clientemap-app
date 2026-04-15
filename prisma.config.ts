import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env first, then .env.local overrides (same order as Next.js)
config();
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL: direct postgres connection for migrations (bypasses pgbouncer).
    // Falls back to DATABASE_URL if DIRECT_URL is not set.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]!,
  },
});
