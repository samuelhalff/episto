-- Rollback for 0030.
--
-- HONEST LIMITATION, read before running this: this is not a true inverse, and
-- it cannot be.
--
-- Two things are unrecoverable:
--
--   * Payloads nulled by `markEmailSent` are gone. That is the point of the
--     forward migration. Restoring NOT NULL on "payload" would fail outright
--     against any row sent since 0030 deployed, so this script does not try —
--     the column stays nullable. Application code that assumes a payload is
--     always present must not be rolled back past this migration.
--   * Rows sitting in status 'sending' are live claims: a worker either has
--     them in flight right now or died holding one. Narrowing the CHECK would
--     reject them, so they are first released back to 'pending', which is
--     exactly what the stall sweep would have done to a stuck claim anyway.
--     A row released while its worker was mid-send can be sent twice.
--
-- Nothing here destroys a pending promise: every row that is still owed
-- survives as 'pending' and remains visible to the sweep.

UPDATE "email_outbox" SET "status" = 'pending' WHERE "status" = 'sending';
--> statement-breakpoint

ALTER TABLE "email_outbox" DROP CONSTRAINT IF EXISTS "email_outbox_status_check";
--> statement-breakpoint

ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_status_check"
  CHECK (status IN ('pending', 'sent', 'failed'));
--> statement-breakpoint

DROP INDEX IF EXISTS "email_outbox_pending_idx";
--> statement-breakpoint

CREATE INDEX "email_outbox_pending_idx"
  ON "email_outbox" ("created_at")
  WHERE "status" = 'pending';
