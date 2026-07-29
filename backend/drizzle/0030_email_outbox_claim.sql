-- Make the outbox actually deliver at-most-once, and stop it hoarding customer data.
--
-- 0029 gave every transactional email a durable row. Review found four things
-- that row could not yet do:
--
--   1. It could not stop a duplicate send. The worker called Resend first and
--      looked at the row afterwards, so a redelivered BullMQ job — a lost lock,
--      a crash between the send and the job completing — sent the email again.
--      A worker now claims the row before spending a provider call on it, and
--      `sending` is that claim.
--   2. Nothing pruned it. Receipt payloads hold a base64 PDF; every payload
--      holds a recipient address and the body of someone's mail. Once a row is
--      `sent` there is nothing left to re-drive, so the payload is dropped and
--      the row becomes a dedupe tombstone. That needs the NOT NULL gone.
--   3. The partial index was on `created_at` while the sweep filters on
--      `COALESCE(last_attempted_at, created_at)` — a re-driven row's clock
--      restarts — so the index never served the query it was built for.
--   4. The status CHECK did not know about `sending`.
--
-- Safe on a live database: the table is days old and small, every statement
-- takes a brief ACCESS EXCLUSIVE lock on it alone, and nothing here rewrites
-- rows (DROP NOT NULL is catalog-only). The index is built without
-- CONCURRENTLY because drizzle runs migrations in a transaction and a table
-- this size does not justify splitting the migration to avoid a lock measured
-- in milliseconds.

-- `sending` is a claim held for the duration of one provider call, so that a
-- redelivered job finds the row already taken and sends nothing.
ALTER TABLE "email_outbox" DROP CONSTRAINT IF EXISTS "email_outbox_status_check";
--> statement-breakpoint

ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_status_check"
  CHECK (status IN ('pending', 'sending', 'sent', 'failed'));
--> statement-breakpoint

-- A sent row keeps its dedupe_key, status, timestamps and provider_message_id.
-- It does not keep the customer's mail.
ALTER TABLE "email_outbox" ALTER COLUMN "payload" DROP NOT NULL;
--> statement-breakpoint

-- Match the sweep's real predicate: still owed, still re-drivable, and
-- untouched for a full stall window measured from the *last attempt*.
DROP INDEX IF EXISTS "email_outbox_pending_idx";
--> statement-breakpoint

CREATE INDEX "email_outbox_pending_idx"
  ON "email_outbox" (COALESCE("last_attempted_at", "created_at"))
  WHERE "status" IN ('pending', 'sending');
