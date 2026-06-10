DROP TABLE IF EXISTS "signature_events";
DROP TABLE IF EXISTS "signature_sessions";

DROP TYPE IF EXISTS "signature_session_status";
DROP TYPE IF EXISTS "signature_eligibility_status";
DROP TYPE IF EXISTS "signature_provider";

ALTER TABLE "draft_letters" DROP COLUMN IF EXISTS "signature_assurance_level";
DROP TYPE IF EXISTS "signature_assurance_level";

ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" DROP DEFAULT;
ALTER TYPE "signature_flow_mode" RENAME TO "signature_flow_mode_old";
CREATE TYPE "signature_flow_mode" AS ENUM ('none', 'visual');
ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" TYPE "signature_flow_mode"
  USING (
    CASE
      WHEN "signature_flow_mode"::text = 'swisssign_ses' THEN 'visual'
      ELSE "signature_flow_mode"::text
    END::"signature_flow_mode"
  );
ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" SET DEFAULT 'visual';
DROP TYPE "signature_flow_mode_old";

ALTER TABLE "draft_letters"
  ALTER COLUMN "fulfillment_status" DROP DEFAULT;
ALTER TYPE "order_fulfillment_status" RENAME TO "order_fulfillment_status_old";
CREATE TYPE "order_fulfillment_status" AS ENUM (
  'draft_created',
  'draft_completed',
  'preview_ready',
  'signature_not_required',
  'payment_authorized',
  'dispatch_submitted',
  'payment_captured',
  'dispatch_confirmed',
  'completed',
  'failed',
  'expired'
);
ALTER TABLE "draft_letters"
  ALTER COLUMN "fulfillment_status" TYPE "order_fulfillment_status"
  USING (
    CASE
      WHEN "fulfillment_status"::text IN (
        'signature_selected',
        'signature_eligibility_confirmed'
      ) THEN 'signature_not_required'
      WHEN "fulfillment_status"::text IN (
        'identity_stepup_started',
        'signature_session_created',
        'signature_in_progress',
        'signature_completed',
        'signed_document_attached'
      ) THEN 'payment_authorized'
      ELSE "fulfillment_status"::text
    END::"order_fulfillment_status"
  );
ALTER TABLE "draft_letters"
  ALTER COLUMN "fulfillment_status" SET DEFAULT 'draft_created';
DROP TYPE "order_fulfillment_status_old";
