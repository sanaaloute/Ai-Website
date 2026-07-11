#!/bin/sh
set -e

# Ensure the SQLite data directory exists
mkdir -p /app/data

# Apply Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Seed the database if it's empty
USER_COUNT=$(sqlite3 /app/data/dev.db "SELECT COUNT(*) FROM User;" 2>/dev/null || echo 0)
if [ "$USER_COUNT" = "0" ]; then
  echo "Database is empty. Seeding..."
  sqlite3 /app/data/dev.db < /app/prisma/seed.sql
else
  echo "Database already seeded."
fi

exec "$@"
