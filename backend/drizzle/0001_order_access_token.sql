-- Migration: 0001_order_access_token
-- Add distinct long-lived order access token to payment_attempts.
-- These tokens have a 90-day TTL and are separate from the drafting session
-- resume token, per docs/05-architecture/session-management.md §Paid Orders.

ALTER TABLE "payment_attempts"
  ADD COLUMN IF NOT EXISTS "order_access_token_hash" text UNIQUE,
  ADD COLUMN IF NOT EXISTS "order_access_token_expires_at" timestamp;

CREATE INDEX IF NOT EXISTS "payment_attempts_order_token_idx"
  ON "payment_attempts" ("order_access_token_hash");
