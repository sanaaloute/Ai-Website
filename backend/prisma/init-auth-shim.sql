-- init-auth-shim.sql
--
-- Minimal shim so the platform's Supabase-flavored Prisma migrations run on a
-- VANILLA Postgres (the self-host stack uses postgres:16-alpine, not Supabase).
--
-- The migrations link `public.users.id` -> `auth.users(id)` and install an
-- `on_auth_user_created` trigger on `auth.users`. Supabase provides the `auth`
-- schema natively; plain Postgres does not, so we create just enough for those
-- statements (and any `auth.uid()` reference) to succeed. Auth itself is still
-- handled by the platform via supabase-js — this table is only a migration target.
--
-- Mounted into the postgres container at /docker-entrypoint-initdb.d/ so it runs
-- once on first database creation (before `prisma migrate deploy`).

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  encrypted_password text,
  raw_user_meta_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Stub for any `auth.uid()` reference (returns NULL outside Supabase).
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULL::uuid; $$;
