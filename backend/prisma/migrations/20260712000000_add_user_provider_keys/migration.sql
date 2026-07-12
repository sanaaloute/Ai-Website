-- CreateTable
CREATE TABLE IF NOT EXISTS "user_provider_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR NOT NULL,
    "api_key" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_provider_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ix_user_provider_keys_user_id_provider" ON "user_provider_keys"("user_id", "provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ix_user_provider_keys_user_id" ON "user_provider_keys"("user_id");

-- AddForeignKey
ALTER TABLE "user_provider_keys" ADD CONSTRAINT "user_provider_keys_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_provider" VARCHAR;

-- Backfill: migrate existing single API keys into the per-provider table as 'tokenfree'
INSERT INTO "user_provider_keys" ("user_id", "provider", "api_key")
SELECT "id", 'tokenfree', "ai_website_api_key"
FROM "users"
WHERE "ai_website_api_key" IS NOT NULL AND "ai_website_api_key" <> ''
ON CONFLICT DO NOTHING;

-- Backfill: users with a legacy key get 'tokenfree' as their active provider
UPDATE "users"
SET "active_provider" = 'tokenfree'
WHERE "active_provider" IS NULL
  AND "ai_website_api_key" IS NOT NULL AND "ai_website_api_key" <> '';
