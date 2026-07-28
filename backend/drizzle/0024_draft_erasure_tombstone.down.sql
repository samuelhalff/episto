DROP TRIGGER IF EXISTS "draft_letters_erasure_guard" ON "draft_letters";
DROP TRIGGER IF EXISTS "draft_snapshots_update_erasure_guard" ON "draft_snapshots";
DROP TRIGGER IF EXISTS "draft_quote_cache_erasure_guard" ON "draft_quote_cache";
DROP TRIGGER IF EXISTS "payment_attempts_erasure_guard" ON "payment_attempts";
DROP TRIGGER IF EXISTS "dispatch_attempts_erasure_guard" ON "dispatch_attempts";
DROP TRIGGER IF EXISTS "file_assets_erasure_guard" ON "file_assets";
DROP TRIGGER IF EXISTS "draft_snapshots_erasure_guard" ON "draft_snapshots";
DROP TRIGGER IF EXISTS "conversation_messages_erasure_guard" ON "conversation_messages";
--> statement-breakpoint
DROP FUNCTION IF EXISTS "assert_draft_letter_not_erased"();
DROP FUNCTION IF EXISTS "assert_snapshot_not_erased"();
DROP FUNCTION IF EXISTS "assert_draft_not_erased"();
--> statement-breakpoint
DROP INDEX IF EXISTS "dispatch_attempts_queued_draft_idx";
ALTER TABLE "draft_letters" DROP COLUMN IF EXISTS "erasure_requested_at";
