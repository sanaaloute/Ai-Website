import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { resolve } from "path";

// Load .env from both the backend-nestjs directory and the project root.
// Later loads do not override already-set variables.
config({ path: resolve(__dirname, ".env") });
config({ path: resolve(__dirname, "..", ".env") });

// Fall back to a placeholder so `prisma generate` can run during Docker builds
// where no .env is present. Runtime commands (migrate/deploy) receive the real
// DATABASE_URL from the container environment.
const databaseUrl = process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/postgres";

// Prisma CLI commands (migrate deploy) must use the session-mode pooler because
// the transaction-mode pooler (pgbouncer) cannot run migrations reliably. The
// Nest runtime uses DATABASE_URL (transaction pooler) via the pg adapter.
const migrationUrl = process.env["DIRECT_URL"] ?? databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
