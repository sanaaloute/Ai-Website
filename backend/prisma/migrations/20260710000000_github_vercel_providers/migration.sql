-- Migrate project integration metadata from GitCC/OpenHost to GitHub/Vercel.
-- New columns
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "github_repo_url" VARCHAR,
  ADD COLUMN IF NOT EXISTS "vercel_project_id" VARCHAR,
  ADD COLUMN IF NOT EXISTS "vercel_domain_url" VARCHAR,
  ADD COLUMN IF NOT EXISTS "vercel_deployed_at" TIMESTAMP(6);

-- Preserve existing links for projects that were already deployed.
UPDATE "projects" SET "github_repo_url" = "gitcc_repo_url" WHERE "gitcc_repo_url" IS NOT NULL;
UPDATE "projects" SET "vercel_project_id" = "openhost_app_uuid" WHERE "openhost_app_uuid" IS NOT NULL;
UPDATE "projects" SET "vercel_domain_url" = "openhost_domain_url" WHERE "openhost_domain_url" IS NOT NULL;
UPDATE "projects" SET "vercel_deployed_at" = "openhost_deployed_at" WHERE "openhost_deployed_at" IS NOT NULL;

-- Drop legacy columns (and the deploy-key index that backed them).
DROP INDEX IF EXISTS "ix_projects_gitcc_deploy_key_uuid";
ALTER TABLE "projects"
  DROP COLUMN IF EXISTS "openhost_app_uuid",
  DROP COLUMN IF EXISTS "openhost_domain_url",
  DROP COLUMN IF EXISTS "openhost_deployed_at",
  DROP COLUMN IF EXISTS "gitcc_repo_url",
  DROP COLUMN IF EXISTS "gitcc_deploy_key_uuid";

CREATE INDEX IF NOT EXISTS "ix_projects_github_repo_url" ON "projects"("github_repo_url");
