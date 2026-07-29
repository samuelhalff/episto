-- The record of intent behind every transactional email.
--
-- Until now an email existed only as a BullMQ job. When Redis lost the job, or
-- the retries ran out, the email stopped existing and nobody was told — and
-- some of these emails (`dispatch-accepted`) carry the only link a paying
-- customer has to the letter they bought. This table is the durable half: the
-- row is written before the job is enqueued, so "was this email owed?" is
-- answerable from Postgres even when Redis has forgotten everything.
--
-- `dedupe_key` is the logical identity of the email, not of the attempt —
-- `dispatch-accepted-<attemptId>`, `refund-confirmed-<stripeRefundId>`. It is
-- UNIQUE, and it is also the BullMQ job id, which makes the "at most once"
-- guarantee outlive Redis: a completed job ages out of Redis within a day, but
-- the row stays, so a caller that fires the same notification twice is refused
-- by the insert rather than by the queue.

CREATE TABLE "email_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dedupe_key" text NOT NULL,
  "recipient" text NOT NULL,
  "template" text NOT NULL,
  "locale" text NOT NULL,
  -- The customer-facing handle for this email (order reference, draft id).
  -- Without it an operator holding a failed row can see that "someone" missed
  -- an email but has no way to find the order it belonged to.
  "reference" text,
  -- The full job payload, attachments included. Receipt attachments make some
  -- of these rows large, and that is the intended trade: a sweep that
  -- re-enqueues from a payload with the PDF stripped out would resend the
  -- receipt email without the receipt.
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "provider_message_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "last_attempted_at" timestamptz,
  "sent_at" timestamptz
);
--> statement-breakpoint

ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_dedupe_key_unique"
  UNIQUE ("dedupe_key");
--> statement-breakpoint

ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_status_check"
  CHECK (status IN ('pending', 'sent', 'failed'));
--> statement-breakpoint

-- The stall sweep asks one question — "which rows are still pending and old?"
-- — many times an hour, so it gets its own partial index rather than scanning
-- a table that keeps every email ever sent.
CREATE INDEX "email_outbox_pending_idx"
  ON "email_outbox" ("created_at")
  WHERE "status" = 'pending';
--> statement-breakpoint

-- Support answers "did this customer get their email?" by address.
CREATE INDEX "email_outbox_recipient_idx" ON "email_outbox" ("recipient", "created_at");
