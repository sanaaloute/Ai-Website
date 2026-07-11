-- Defensive dev->prod sync migration.
-- Prod was baselined against the init migration but its actual schema is
-- missing several init tables/columns. This migration creates any missing
-- tables, adds missing columns, and applies the dev sync changes safely.

CREATE SCHEMA IF NOT EXISTS "public";

-- ---------------------------------------------------------------------------
-- Ensure all init tables exist (CREATE TABLE IF NOT EXISTS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "company" TEXT,
    "location" TEXT,
    "role" TEXT,
    "bio" TEXT,
    "lovecode_api_key" TEXT,
    "subscribed" BOOLEAN NOT NULL DEFAULT false,
    "subscription_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "login_frequency" INTEGER NOT NULL DEFAULT 0,
    "app_usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_active" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "reset_token" TEXT,
    "reset_token_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID,
    "admin_email" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "target_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "project_generations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "thread_id" TEXT NOT NULL,
    "prompt" TEXT,
    "workflow" TEXT,
    "status" TEXT NOT NULL DEFAULT 'started',
    "error" TEXT,
    "summary" TEXT,
    "preview_url" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_generations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_checkpoints" (
    "id" SERIAL NOT NULL,
    "thread_id" TEXT NOT NULL,
    "checkpoint_ns" TEXT NOT NULL DEFAULT '',
    "checkpoint_id" TEXT NOT NULL,
    "parent_checkpoint_id" TEXT,
    "checkpoint" TEXT NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_writes" (
    "id" SERIAL NOT NULL,
    "thread_id" TEXT NOT NULL,
    "checkpoint_ns" TEXT NOT NULL DEFAULT '',
    "checkpoint_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_writes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "project_id" UUID,
    "memory_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plan" TEXT,
    "amount" DOUBLE PRECISION,
    "billing_interval" TEXT,
    "metadata" JSONB,
    "current_period_end" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "deployments_count" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'TypeScript',
    "framework" TEXT NOT NULL DEFAULT 'Next.js',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- users: add missing columns and migrate types
-- ---------------------------------------------------------------------------
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "full_name" VARCHAR,
  ADD COLUMN IF NOT EXISTS "phone" VARCHAR,
  ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR,
  ADD COLUMN IF NOT EXISTS "company" VARCHAR,
  ADD COLUMN IF NOT EXISTS "location" VARCHAR,
  ADD COLUMN IF NOT EXISTS "role" VARCHAR,
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "lovecode_api_key" VARCHAR,
  ADD COLUMN IF NOT EXISTS "subscribed" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "subscription_type" VARCHAR,
  ADD COLUMN IF NOT EXISTS "status" VARCHAR NOT NULL DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS "login_frequency" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "app_usage_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_active" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "full_name" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "phone" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "avatar_url" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "company" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "location" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "lovecode_api_key" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "subscribed" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "subscription_type" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE VARCHAR;
ALTER TABLE "users" ALTER COLUMN "last_active" SET DATA TYPE TIMESTAMP(6);
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6);
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(6);

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
ALTER TABLE "admin_users"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "email" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "full_name" VARCHAR,
  ADD COLUMN IF NOT EXISTS "role" VARCHAR NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS "reset_token" VARCHAR,
  ADD COLUMN IF NOT EXISTS "reset_token_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "admin_users" ALTER COLUMN "email" SET DATA TYPE VARCHAR;
ALTER TABLE "admin_users" ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR;
ALTER TABLE "admin_users" ALTER COLUMN "full_name" SET DATA TYPE VARCHAR;
ALTER TABLE "admin_users" ALTER COLUMN "role" SET DATA TYPE VARCHAR;
ALTER TABLE "admin_users" ALTER COLUMN "reset_token" SET DATA TYPE VARCHAR;

-- ---------------------------------------------------------------------------
-- admin_activity_logs
-- ---------------------------------------------------------------------------
ALTER TABLE "admin_activity_logs"
  ADD COLUMN IF NOT EXISTS "admin_name" VARCHAR,
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "admin_id" UUID,
  ADD COLUMN IF NOT EXISTS "admin_email" VARCHAR,
  ADD COLUMN IF NOT EXISTS "action" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "target" VARCHAR,
  ADD COLUMN IF NOT EXISTS "target_id" VARCHAR,
  ADD COLUMN IF NOT EXISTS "details" JSONB,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "admin_activity_logs" ALTER COLUMN "admin_email" SET DATA TYPE VARCHAR;
ALTER TABLE "admin_activity_logs" ALTER COLUMN "action" SET DATA TYPE VARCHAR;
ALTER TABLE "admin_activity_logs" ALTER COLUMN "target" SET DATA TYPE VARCHAR;
ALTER TABLE "admin_activity_logs" ALTER COLUMN "target_id" SET DATA TYPE VARCHAR;
ALTER TABLE "admin_activity_logs" ALTER COLUMN "created_at" DROP NOT NULL;
ALTER TABLE "admin_activity_logs" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "email" VARCHAR,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "customers" ALTER COLUMN "stripe_customer_id" SET DATA TYPE VARCHAR;

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "cancel_at_period_end" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "current_period_start" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR,
  ADD COLUMN IF NOT EXISTS "stripe_price_id" VARCHAR,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "status" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "plan" VARCHAR,
  ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "billing_interval" VARCHAR,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "current_period_end" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "subscriptions" ALTER COLUMN "stripe_subscription_id" SET DATA TYPE VARCHAR;
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE VARCHAR;
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE VARCHAR;
ALTER TABLE "subscriptions" ALTER COLUMN "amount" SET DEFAULT 0;
ALTER TABLE "subscriptions" ALTER COLUMN "billing_interval" SET DATA TYPE VARCHAR;
ALTER TABLE "subscriptions" ALTER COLUMN "current_period_end" SET DATA TYPE TIMESTAMP(6);
ALTER TABLE "subscriptions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6);
ALTER TABLE "subscriptions" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(6);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "deployments_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deployments" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "gitcc_repo_url" VARCHAR,
  ADD COLUMN IF NOT EXISTS "openhost_app_uuid" VARCHAR,
  ADD COLUMN IF NOT EXISTS "openhost_deployed_at" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "openhost_domain_url" VARCHAR,
  ADD COLUMN IF NOT EXISTS "pocketbase_admin_url" VARCHAR,
  ADD COLUMN IF NOT EXISTS "pocketbase_url" VARCHAR,
  ADD COLUMN IF NOT EXISTS "name" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "status" VARCHAR NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS "stars" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "forks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "language" VARCHAR DEFAULT 'TypeScript',
  ADD COLUMN IF NOT EXISTS "framework" VARCHAR DEFAULT 'Next.js',
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "projects" ALTER COLUMN "name" SET DATA TYPE VARCHAR;
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE VARCHAR;
ALTER TABLE "projects" ALTER COLUMN "language" DROP NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "language" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "language" SET DATA TYPE VARCHAR;
ALTER TABLE "projects" ALTER COLUMN "framework" DROP NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "framework" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "framework" SET DATA TYPE VARCHAR;
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6);
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(6);

-- ---------------------------------------------------------------------------
-- files
-- ---------------------------------------------------------------------------
ALTER TABLE "files"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR,
  ADD COLUMN IF NOT EXISTS "name" VARCHAR,
  ADD COLUMN IF NOT EXISTS "size_bytes" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "status" VARCHAR DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "path" VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "content" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "files" ALTER COLUMN "path" SET DATA TYPE VARCHAR;
ALTER TABLE "files" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(6);
ALTER TABLE "files" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(6);

-- ---------------------------------------------------------------------------
-- project_generations: ensure all columns exist
-- ---------------------------------------------------------------------------
ALTER TABLE "project_generations"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "project_id" UUID,
  ADD COLUMN IF NOT EXISTS "thread_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "prompt" TEXT,
  ADD COLUMN IF NOT EXISTS "workflow" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'started',
  ADD COLUMN IF NOT EXISTS "error" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "preview_url" TEXT,
  ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Generation logs can be created before the project is saved to the cloud.
ALTER TABLE "project_generations" ALTER COLUMN "project_id" DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- agent_checkpoints: ensure all columns exist
-- ---------------------------------------------------------------------------
ALTER TABLE "agent_checkpoints"
  ADD COLUMN IF NOT EXISTS "id" SERIAL NOT NULL,
  ADD COLUMN IF NOT EXISTS "thread_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "checkpoint_ns" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "checkpoint_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "parent_checkpoint_id" TEXT,
  ADD COLUMN IF NOT EXISTS "checkpoint" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "metadata" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- agent_writes: ensure all columns exist
-- ---------------------------------------------------------------------------
ALTER TABLE "agent_writes"
  ADD COLUMN IF NOT EXISTS "id" SERIAL NOT NULL,
  ADD COLUMN IF NOT EXISTS "thread_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "checkpoint_ns" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "checkpoint_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "task_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "idx" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "value" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- LangGraph pending writes may be channel placeholders with no value.
ALTER TABLE "agent_writes" ALTER COLUMN "value" DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- agent_memories: ensure all columns exist
-- ---------------------------------------------------------------------------
ALTER TABLE "agent_memories"
  ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "user_id" UUID,
  ADD COLUMN IF NOT EXISTS "project_id" UUID,
  ADD COLUMN IF NOT EXISTS "memory_type" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- New tables (dev sync)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin_password_resets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "token_hash" VARCHAR NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_password_resets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "alembic_version" (
    "version_num" VARCHAR(32) NOT NULL,

    CONSTRAINT "alembic_version_pkc" PRIMARY KEY ("version_num")
);

CREATE TABLE IF NOT EXISTS "engagement_heatmap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day" VARCHAR NOT NULL,
    "hour" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,

    CONSTRAINT "engagement_heatmap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "feature_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feature_name" VARCHAR NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,

    CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stripe_payment_intent_id" VARCHAR NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "action" VARCHAR NOT NULL,
    "details" VARCHAR,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_seconds" INTEGER,
    "actions_count" INTEGER DEFAULT 0,
    "ip_address" VARCHAR,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "feature" VARCHAR,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Indexes (init + sync)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_user_id_key" ON "customers"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_stripe_customer_id_key" ON "customers"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_checkpoints_thread_id_checkpoint_ns_checkpoint_id_key" ON "agent_checkpoints"("thread_id", "checkpoint_ns", "checkpoint_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_writes_thread_id_checkpoint_ns_checkpoint_id_task_id__key" ON "agent_writes"("thread_id", "checkpoint_ns", "checkpoint_id", "task_id", "idx");

DROP INDEX IF EXISTS "ix_files_project_id_path";
CREATE UNIQUE INDEX "ix_files_project_id_path" ON "files"("project_id", "path");

CREATE INDEX IF NOT EXISTS "ix_admin_password_resets_token_hash" ON "admin_password_resets"("token_hash");
CREATE INDEX IF NOT EXISTS "ix_engagement_heatmap_date" ON "engagement_heatmap"("date");
CREATE INDEX IF NOT EXISTS "ix_feature_usage_date" ON "feature_usage"("date");
CREATE INDEX IF NOT EXISTS "ix_user_activities_timestamp" ON "user_activities"("timestamp");
CREATE INDEX IF NOT EXISTS "ix_user_activities_user_id" ON "user_activities"("user_id");
CREATE INDEX IF NOT EXISTS "ix_user_sessions_user_id" ON "user_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "ix_user_sessions_started_at" ON "user_sessions"("started_at");
CREATE INDEX IF NOT EXISTS "ix_user_events_user_id" ON "user_events"("user_id");
CREATE INDEX IF NOT EXISTS "ix_user_events_created_at" ON "user_events"("created_at");
CREATE INDEX IF NOT EXISTS "ix_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "ix_users_status" ON "users"("status");
CREATE INDEX IF NOT EXISTS "ix_admin_users_email" ON "admin_users"("email");
CREATE INDEX IF NOT EXISTS "ix_admin_activity_logs_timestamp" ON "admin_activity_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "ix_subscriptions_user_id" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "ix_subscriptions_status" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "ix_projects_user_id" ON "projects"("user_id");

DROP INDEX IF EXISTS "idx_project_generations_user_project";
DROP INDEX IF EXISTS "project_generations_user_id_project_id_created_at_idx";
CREATE INDEX "idx_project_generations_user_project" ON "project_generations"("user_id", "project_id", "created_at" DESC);

DROP INDEX IF EXISTS "idx_project_generations_thread";
DROP INDEX IF EXISTS "project_generations_thread_id_idx";
CREATE INDEX "idx_project_generations_thread" ON "project_generations"("thread_id");

DROP INDEX IF EXISTS "idx_agent_checkpoints_thread";
DROP INDEX IF EXISTS "agent_checkpoints_thread_id_checkpoint_ns_created_at_idx";
CREATE INDEX "idx_agent_checkpoints_thread" ON "agent_checkpoints"("thread_id", "checkpoint_ns", "created_at" DESC);

DROP INDEX IF EXISTS "idx_agent_writes_thread";
DROP INDEX IF EXISTS "agent_writes_thread_id_checkpoint_ns_checkpoint_id_idx";
CREATE INDEX "idx_agent_writes_thread" ON "agent_writes"("thread_id", "checkpoint_ns", "checkpoint_id");

DROP INDEX IF EXISTS "idx_agent_memories_lookup";
DROP INDEX IF EXISTS "agent_memories_user_id_project_id_memory_type_idx";
CREATE INDEX "idx_agent_memories_lookup" ON "agent_memories"("user_id", "project_id", "memory_type");

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "admin_activity_logs" DROP CONSTRAINT IF EXISTS "admin_activity_logs_admin_id_fkey";
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_user_id_fkey";
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_user_id_fkey";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_fkey";
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_user_id_fkey";
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_project_id_fkey";
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_generations" DROP CONSTRAINT IF EXISTS "project_generations_project_id_fkey";
ALTER TABLE "project_generations" ADD CONSTRAINT "project_generations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "project_generations" DROP CONSTRAINT IF EXISTS "project_generations_user_id_fkey";
ALTER TABLE "project_generations" ADD CONSTRAINT "project_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "agent_memories" DROP CONSTRAINT IF EXISTS "agent_memories_project_id_fkey";
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "agent_memories" DROP CONSTRAINT IF EXISTS "agent_memories_user_id_fkey";
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "admin_password_resets" DROP CONSTRAINT IF EXISTS "admin_password_resets_admin_id_fkey";
ALTER TABLE "admin_password_resets" ADD CONSTRAINT "admin_password_resets_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_user_id_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "user_activities" DROP CONSTRAINT IF EXISTS "user_activities_user_id_fkey";
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "user_sessions_user_id_fkey";
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "user_events" DROP CONSTRAINT IF EXISTS "user_events_user_id_fkey";
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Link public.users to Supabase Auth users
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_id_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Supabase Auth trigger (best-effort; may fail if no auth trigger permission)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $func$
  BEGIN
    INSERT INTO public.users ("id", "email", "full_name", "avatar_url", "phone", "created_at", "updated_at")
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone',
      NOW(),
      NOW()
    )
    ON CONFLICT ("id") DO UPDATE SET
      "email" = EXCLUDED.email,
      "full_name" = COALESCE(EXCLUDED.full_name, public.users.full_name),
      "avatar_url" = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      "phone" = COALESCE(EXCLUDED.phone, public.users.phone),
      "updated_at" = NOW();
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create auth trigger: %', SQLERRM;
END $$;
