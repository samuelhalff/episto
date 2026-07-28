DROP INDEX IF EXISTS "dispatch_attempts_under_review_pending_idx";
--> statement-breakpoint
ALTER TABLE "dispatch_attempts" DROP COLUMN "under_review_notified_at";
