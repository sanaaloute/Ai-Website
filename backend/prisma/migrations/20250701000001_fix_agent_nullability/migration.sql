-- Fix production schema drift.
-- The app intentionally stores NULL for generations that are not yet linked
-- to a cloud project, and for LangGraph pending writes that are channel
-- placeholders. The committed Prisma/schema already declared these columns
-- nullable, but some production databases were created with NOT NULL.

ALTER TABLE "project_generations" ALTER COLUMN "project_id" DROP NOT NULL;
ALTER TABLE "agent_writes" ALTER COLUMN "value" DROP NOT NULL;
