import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

config({ path: resolve(import.meta.dirname, "../../.env"), override: true });
config({ path: resolve(import.meta.dirname, "../../.env.example") });
if (process.env.DATABASE_URL?.includes("@localhost:5432")) process.env.DATABASE_URL = process.env.DATABASE_URL.replace("@localhost:5432", "@127.0.0.1:5433");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "node prisma/seed.mjs" },
  datasource: { url: env("DATABASE_URL") }
});
