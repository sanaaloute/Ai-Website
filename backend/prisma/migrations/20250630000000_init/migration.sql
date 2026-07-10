
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
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

-- CreateTable
CREATE TABLE "admin_users" (
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

-- CreateTable
CREATE TABLE "admin_activity_logs" (
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

-- CreateTable
CREATE TABLE "project_generations" (
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

-- CreateTable
CREATE TABLE "agent_checkpoints" (
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

-- CreateTable
CREATE TABLE "agent_writes" (
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

-- CreateTable
CREATE TABLE "agent_memories" (
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

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
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

-- CreateTable
CREATE TABLE "projects" (
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

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "project_generations_user_id_project_id_created_at_idx" ON "project_generations"("user_id", "project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "project_generations_thread_id_idx" ON "project_generations"("thread_id");

-- CreateIndex
CREATE INDEX "agent_checkpoints_thread_id_checkpoint_ns_created_at_idx" ON "agent_checkpoints"("thread_id", "checkpoint_ns", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "agent_checkpoints_thread_id_checkpoint_ns_checkpoint_id_key" ON "agent_checkpoints"("thread_id", "checkpoint_ns", "checkpoint_id");

-- CreateIndex
CREATE INDEX "agent_writes_thread_id_checkpoint_ns_checkpoint_id_idx" ON "agent_writes"("thread_id", "checkpoint_ns", "checkpoint_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_writes_thread_id_checkpoint_ns_checkpoint_id_task_id__key" ON "agent_writes"("thread_id", "checkpoint_ns", "checkpoint_id", "task_id", "idx");

-- CreateIndex
CREATE INDEX "agent_memories_user_id_project_id_memory_type_idx" ON "agent_memories"("user_id", "project_id", "memory_type");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_key" ON "customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_stripe_customer_id_key" ON "customers"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Manual additions for Supabase Auth integration

-- Link public.users to Supabase Auth users
ALTER TABLE "users" ADD CONSTRAINT "users_id_fkey"
  FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Optional trigger to keep public.users in sync with auth.users.
-- If you already have a trigger for this, the DROP/CREATE below will replace it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
