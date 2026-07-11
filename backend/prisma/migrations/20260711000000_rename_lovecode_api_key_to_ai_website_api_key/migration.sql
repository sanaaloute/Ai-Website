-- Rename the per-user API key column to match the AI-Website product naming.
-- Safe to run on a database that already has the old column: it renames in place
-- and preserves all existing values. Fresh databases applying all migrations from
-- scratch end up with the new column name as well.
ALTER TABLE "public"."users" RENAME COLUMN "lovecode_api_key" TO "ai_website_api_key";
