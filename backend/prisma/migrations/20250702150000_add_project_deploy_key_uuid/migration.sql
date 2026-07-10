-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "gitcc_deploy_key_uuid" VARCHAR;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ix_projects_gitcc_deploy_key_uuid" ON "projects"("gitcc_deploy_key_uuid");
