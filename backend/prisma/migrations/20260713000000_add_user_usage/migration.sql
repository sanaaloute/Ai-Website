-- CreateTable: per-user monthly usage counters (generations + sandbox seconds)
CREATE TABLE IF NOT EXISTS "user_usage" (
    "user_id" UUID NOT NULL,
    "period" CHAR(7) NOT NULL,
    "generations" INTEGER NOT NULL DEFAULT 0,
    "sandbox_seconds" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "user_usage_pkey" PRIMARY KEY ("user_id", "period")
);

-- AddForeignKey
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
