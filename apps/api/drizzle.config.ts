import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    wranglerConfigPath: "./wrangler.toml",
    dbName: "getitdone-db-local",
  },
  verbose: true,
  strict: true,
});
