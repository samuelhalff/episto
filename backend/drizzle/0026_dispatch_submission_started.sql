-- The point of no return for a dispatch attempt.
--
-- Set immediately before the provider call, which happens outside any
-- transaction. If the worker dies after this and before it records the
-- outcome, we cannot know whether Swiss Post received the letter — so no
-- worker may claim the attempt again. Posting a registered letter twice
-- (and charging once) is worse than a letter that stops for human review.
ALTER TABLE "dispatch_attempts" ADD COLUMN "submission_started_at" timestamptz;
--> statement-breakpoint
-- The liveness sweep looks for queued attempts that nobody is working on.
CREATE INDEX IF NOT EXISTS "dispatch_attempts_queued_claim_idx"
  ON "dispatch_attempts" ("claimed_at")
  WHERE "state" = 'queued';
