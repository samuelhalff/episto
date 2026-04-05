ALTER TABLE "dispatch_attempts"
  ADD COLUMN IF NOT EXISTS "payment_attempt_id" uuid REFERENCES "payment_attempts" ("id"),
  ADD COLUMN IF NOT EXISTS "tracking_number" text;

CREATE INDEX IF NOT EXISTS "dispatch_attempts_payment_attempt_id_idx"
  ON "dispatch_attempts" ("payment_attempt_id");
