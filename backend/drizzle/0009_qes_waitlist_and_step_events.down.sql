DROP INDEX IF EXISTS "product_events_draft_id_idx";
DROP INDEX IF EXISTS "product_events_step_time_idx";

ALTER TABLE "product_events"
  DROP COLUMN IF EXISTS "draft_id",
  DROP COLUMN IF EXISTS "step";

DROP INDEX IF EXISTS "qes_waitlist_created_at_idx";
DROP INDEX IF EXISTS "qes_waitlist_email_idx";
DROP TABLE IF EXISTS "qes_waitlist";
