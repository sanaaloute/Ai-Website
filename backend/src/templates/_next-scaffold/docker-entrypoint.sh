#!/bin/sh
set -e

# Ensure the SQLite data directory exists (no-op for remote/libSQL)
mkdir -p /app/data 2>/dev/null || true

# Apply the Prisma schema to the database without migration history.
# (Generated templates ship schema.prisma only; `db push` creates the tables.)
echo "Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss

# Idempotent seed (creates the default admin user if missing)
echo "Seeding database..."
npx prisma db seed || echo "Seed skipped."

exec "$@"
