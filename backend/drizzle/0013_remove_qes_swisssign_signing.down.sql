DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signature_assurance_level') THEN
    CREATE TYPE "signature_assurance_level" AS ENUM ('visual', 'advanced');
  END IF;
END $$;
ALTER TABLE "draft_letters"
  ADD COLUMN IF NOT EXISTS "signature_assurance_level" "signature_assurance_level" NOT NULL DEFAULT 'visual';

ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" DROP DEFAULT;
ALTER TYPE "signature_flow_mode" RENAME TO "signature_flow_mode_old";
CREATE TYPE "signature_flow_mode" AS ENUM ('none', 'visual', 'swisssign_ses');
ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" TYPE "signature_flow_mode"
  USING "signature_flow_mode"::text::"signature_flow_mode";
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
  'signature_selected',
  'signature_eligibility_confirmed',
  'payment_authorized',
  'identity_stepup_started',
  'signature_session_created',
  'signature_in_progress',
  'signature_completed',
  'signed_document_attached',
  'dispatch_submitted',
  'payment_captured',
  'dispatch_confirmed',
  'completed',
  'failed',
  'expired'
);
ALTER TABLE "draft_letters"
  ALTER COLUMN "fulfillment_status" TYPE "order_fulfillment_status"
  USING "fulfillment_status"::text::"order_fulfillment_status";
ALTER TABLE "draft_letters"
  ALTER COLUMN "fulfillment_status" SET DEFAULT 'draft_created';
DROP TYPE "order_fulfillment_status_old";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signature_provider') THEN
    CREATE TYPE "signature_provider" AS ENUM ('swisssign', 'swisssign_mock');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signature_eligibility_status') THEN
    CREATE TYPE "signature_eligibility_status" AS ENUM (
      'not_started',
      'checking',
      'eligible',
      'conditionally_eligible',
      'blocked'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signature_session_status') THEN
    CREATE TYPE "signature_session_status" AS ENUM (
      'not_required',
      'eligibility_pending',
      'eligibility_confirmed',
      'payment_authorized',
      'identity_stepup_started',
      'signature_session_created',
      'signature_in_progress',
      'signature_completed',
      'signed_document_attached',
      'failed',
      'expired',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "signature_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "draft_id" uuid NOT NULL REFERENCES "draft_letters"("id"),
  "session_id" uuid NOT NULL REFERENCES "sessions"("id"),
  "payment_attempt_id" uuid REFERENCES "payment_attempts"("id"),
  "signature_flow_mode" "signature_flow_mode" NOT NULL,
  "provider" "signature_provider" NOT NULL,
  "eligibility_status" "signature_eligibility_status" NOT NULL DEFAULT 'not_started',
  "eligibility_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" "signature_session_status" NOT NULL DEFAULT 'eligibility_pending',
  "provider_session_id" text,
  "handoff_url" text,
  "oidc_state" text,
  "oidc_nonce" text,
  "pkce_code_verifier" text,
  "signed_file_asset_id" uuid REFERENCES "file_assets"("id"),
  "failure_reason" text,
  "expires_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "signature_sessions_draft_id_idx"
  ON "signature_sessions" ("draft_id");
CREATE INDEX IF NOT EXISTS "signature_sessions_session_id_idx"
  ON "signature_sessions" ("session_id");
CREATE INDEX IF NOT EXISTS "signature_sessions_payment_attempt_id_idx"
  ON "signature_sessions" ("payment_attempt_id");
CREATE INDEX IF NOT EXISTS "signature_sessions_provider_session_id_idx"
  ON "signature_sessions" ("provider_session_id");
CREATE INDEX IF NOT EXISTS "signature_sessions_status_idx"
  ON "signature_sessions" ("status");

CREATE TABLE IF NOT EXISTS "signature_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "signature_session_id" uuid NOT NULL REFERENCES "signature_sessions"("id"),
  "draft_id" uuid NOT NULL REFERENCES "draft_letters"("id"),
  "event_source" text NOT NULL,
  "event_type" text NOT NULL,
  "event_key" text NOT NULL,
  "payload" jsonb,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "signature_events_event_key_idx"
  ON "signature_events" ("event_key");
CREATE INDEX IF NOT EXISTS "signature_events_session_created_idx"
  ON "signature_events" ("signature_session_id", "created_at");
CREATE INDEX IF NOT EXISTS "signature_events_draft_id_idx"
  ON "signature_events" ("draft_id");
