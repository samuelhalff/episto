DROP INDEX IF EXISTS "dispatch_attempts_queued_claim_idx";
--> statement-breakpoint
ALTER TABLE "dispatch_attempts" DROP COLUMN "submission_started_at";
