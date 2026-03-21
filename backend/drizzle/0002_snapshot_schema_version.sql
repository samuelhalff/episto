ALTER TABLE "draft_snapshots"
ADD COLUMN IF NOT EXISTS "schema_version" integer DEFAULT 1 NOT NULL;
