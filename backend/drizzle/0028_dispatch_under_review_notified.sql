-- "We don't know yet" — said once, and only once.
--
-- An attempt sitting in `unknown` past the dwell window earns the customer an
-- honest under-review email. The sweep that sends it runs every few minutes, so
-- the send needs a durable, per-attempt marker: the BullMQ job id dedupes only
-- as long as the completed job is still in Redis.
ALTER TABLE "dispatch_attempts" ADD COLUMN "under_review_notified_at" timestamptz;
--> statement-breakpoint
-- The sweep asks for `unknown` attempts that have not been told yet.
CREATE INDEX IF NOT EXISTS "dispatch_attempts_under_review_pending_idx"
  ON "dispatch_attempts" ("updated_at")
  WHERE "state" = 'unknown' AND "under_review_notified_at" IS NULL;
