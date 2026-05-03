DROP TABLE IF EXISTS "signature_events";
DROP TABLE IF EXISTS "signature_sessions";

ALTER TABLE "draft_letters"
  DROP COLUMN IF EXISTS "fulfillment_status",
  DROP COLUMN IF EXISTS "signature_flow_mode";
