-- Add partial unique index on dispatch_attempts(payment_attempt_id) to prevent
-- duplicate dispatch attempts for the same payment (P0-002 backstop). The WHERE
-- clause excludes NULL values so multiple dispatch attempts without a linked
-- payment are still allowed (e.g. manual/test dispatches). Idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS dispatch_attempts_payment_attempt_id_uniq
  ON dispatch_attempts (payment_attempt_id)
  WHERE payment_attempt_id IS NOT NULL;
