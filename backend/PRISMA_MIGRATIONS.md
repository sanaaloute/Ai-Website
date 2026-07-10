# Prisma Migrations

This project uses [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) to manage the Supabase (Postgres) schema.

## Environment variable

Add the **direct** Supabase Postgres connection string to your backend environment:

```bash
# backend-nestjs/.env or root .env (loaded by docker-compose.yaml)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

Use the direct URL (port `5432`), **not** the connection pooler URL, for migrations.

## Local workflow

```bash
cd backend-nestjs

# Generate Prisma Client after pulling the repo or changing the schema
npm run prisma:generate

# Create a new migration from schema changes (interactive)
npm run prisma:migrate

# View/edit data
npm run prisma:studio
```

## Production / Docker workflow

The backend Docker image now runs migrations automatically before starting the app:

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

So after each deploy, the container will apply any pending migrations and then start NestJS.

### First deploy to an existing database

If your Supabase project already has the tables from the legacy SQL files, mark the initial migration as already applied instead of letting Prisma try to recreate the tables:

```bash
cd backend-nestjs
npx prisma migrate resolve --applied 20250630000000_init
```

Then future deploys will use `prisma migrate deploy` normally.

### First deploy to a fresh database

If the database is empty, just run:

```bash
npx prisma migrate deploy
```

Or deploy with Docker Compose — the container will run this for you.

## Migration files

Migrations live in:

```
backend-nestjs/prisma/migrations/
```

The initial migration (`20250630000000_init`) creates:

- `users`
- `admin_users`
- `activity_logs`
- `user_sessions`
- `user_events`
- `project_generations`
- `agent_checkpoints`
- `agent_writes`
- `agent_memories`

It also installs the Supabase Auth sync trigger that keeps `public.users` in sync with `auth.users`.

## Adding a new table or column

1. Edit `backend-nestjs/prisma/schema.prisma`.
2. Run:
   ```bash
   npm run prisma:migrate
   ```
3. Name the migration when prompted (e.g. `add_user_preferences`).
4. Commit the updated `schema.prisma` and the new migration directory.

## Notes

- The app still uses the Supabase client for queries. Prisma is currently used for schema migrations and can be adopted incrementally for queries.
- The Prisma CLI is included as a runtime dependency so the Docker image can run `prisma migrate deploy`.
