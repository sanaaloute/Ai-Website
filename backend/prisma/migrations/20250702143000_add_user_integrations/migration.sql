-- CreateTable
CREATE TABLE IF NOT EXISTS "user_integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ix_user_integrations_user_id_provider" ON "user_integrations"("user_id", "provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ix_user_integrations_provider" ON "user_integrations"("provider");

-- AddForeignKey
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
