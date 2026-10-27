import { defineConfig } from "drizzle-kit";

// As migrations usam a conexão direta (sem pooler). Rode pelos scripts do package.json, que carregam o .env.local.
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
