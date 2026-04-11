DROP INDEX IF EXISTS "dispatch_attempts_payment_attempt_id_idx";

ALTER TABLE "dispatch_attempts"
  DROP COLUMN IF EXISTS "payment_attempt_id",
  DROP COLUMN IF EXISTS "tracking_number";
