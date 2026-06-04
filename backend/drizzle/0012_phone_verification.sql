CREATE TYPE "public"."phone_verification_status" AS ENUM(
  'pending',
  'verified',
  'expired',
  'failed'
);
--> statement-breakpoint
ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "phone_e164" text,
  ADD COLUMN IF NOT EXISTS "phone_verified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "payment_attempts"
  ADD COLUMN IF NOT EXISTS "verified_phone_e164" text,
  ADD COLUMN IF NOT EXISTS "phone_verified_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "phone_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id"),
  "draft_id" uuid NOT NULL REFERENCES "draft_letters"("id"),
  "phone_e164" text NOT NULL,
  "code_hash" text NOT NULL,
  "status" "phone_verification_status" DEFAULT 'pending' NOT NULL,
  "send_count" integer DEFAULT 1 NOT NULL,
  "verify_attempt_count" integer DEFAULT 0 NOT NULL,
  "provider" text DEFAULT 'noop' NOT NULL,
  "provider_message_id" text,
  "ip_address" text,
  "user_agent" text,
  "last_sent_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_verifications_session_draft_idx"
  ON "phone_verifications" ("session_id", "draft_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_verifications_phone_idx"
  ON "phone_verifications" ("phone_e164");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_verifications_status_idx"
  ON "phone_verifications" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_verifications_expires_at_idx"
  ON "phone_verifications" ("expires_at");
