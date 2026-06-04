DROP INDEX IF EXISTS "phone_verifications_expires_at_idx";
DROP INDEX IF EXISTS "phone_verifications_status_idx";
DROP INDEX IF EXISTS "phone_verifications_phone_idx";
DROP INDEX IF EXISTS "phone_verifications_session_draft_idx";
DROP TABLE IF EXISTS "phone_verifications";
ALTER TABLE "payment_attempts"
  DROP COLUMN IF EXISTS "phone_verified_at",
  DROP COLUMN IF EXISTS "verified_phone_e164";
ALTER TABLE "sessions"
  DROP COLUMN IF EXISTS "phone_verified_at",
  DROP COLUMN IF EXISTS "phone_e164";
DROP TYPE IF EXISTS "public"."phone_verification_status";
