DO $$ BEGIN
 CREATE TYPE "public"."delivery_type" AS ENUM('standard', 'registered');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dispatch_state" AS ENUM('queued', 'submitted', 'accepted', 'rejected', 'unknown', 'reconciled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."draft_status" AS ENUM('collecting', 'fields_complete', 'reviewed', 'rendering', 'ready', 'submitted', 'dispatched', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."file_asset_kind" AS ENUM('attachment', 'signature', 'rendered_pdf');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."file_status" AS ENUM('active', 'pending_deletion', 'deleted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."locale_enum" AS ENUM('de-CH', 'fr-CH', 'it-CH', 'en-CH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_state" AS ENUM('pending', 'authorized', 'captured', 'failed', 'cancelled', 'refund_pending', 'refunded', 'partially_refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."session_type" AS ENUM('guest');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dispatch_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"state" "dispatch_state" DEFAULT 'queued' NOT NULL,
	"provider_name" text NOT NULL,
	"provider_reference" text,
	"provider_payload" jsonb,
	"submitted_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dispatch_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispatch_attempt_id" uuid NOT NULL,
	"previous_state" "dispatch_state",
	"new_state" "dispatch_state" NOT NULL,
	"source" text NOT NULL,
	"provider_event_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "draft_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "draft_status" DEFAULT 'collecting' NOT NULL,
	"locale" "locale_enum" NOT NULL,
	"delivery_type" "delivery_type" DEFAULT 'standard' NOT NULL,
	"subject" text,
	"body" text,
	"tone" text,
	"intent" text,
	"enclosure_note" text,
	"signature_mode" text,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"sender_profile_id" uuid,
	"recipient_profile_id" uuid,
	"signature_asset_id" uuid,
	"estimated_pages" integer,
	"reviewed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "draft_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"rendered_pdf_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"draft_id" uuid,
	"kind" "file_asset_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sort_order" integer,
	"status" "file_status" DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"state" "payment_state" DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'CHF' NOT NULL,
	"breakdown" jsonb NOT NULL,
	"failure_reason" text,
	"refund_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipient_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"first_name" text,
	"last_name" text,
	"company" text,
	"department" text,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"postal_code" text NOT NULL,
	"city" text NOT NULL,
	"country" text DEFAULT 'CH' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sender_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"company" text,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"postal_code" text NOT NULL,
	"city" text NOT NULL,
	"country" text DEFAULT 'CH' NOT NULL,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "session_type" DEFAULT 'guest' NOT NULL,
	"email" text,
	"resume_token_hash" text NOT NULL,
	"resume_token_expires_at" timestamp with time zone NOT NULL,
	"locale" "locale_enum" DEFAULT 'de-CH' NOT NULL,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_resume_token_hash_unique" UNIQUE("resume_token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"draft_id" uuid,
	"event_type" text NOT NULL,
	"actor" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_draft_id_draft_letters_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_letters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dispatch_attempts" ADD CONSTRAINT "dispatch_attempts_draft_id_draft_letters_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_letters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dispatch_attempts" ADD CONSTRAINT "dispatch_attempts_snapshot_id_draft_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."draft_snapshots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dispatch_status_events" ADD CONSTRAINT "dispatch_status_events_dispatch_attempt_id_dispatch_attempts_id_fk" FOREIGN KEY ("dispatch_attempt_id") REFERENCES "public"."dispatch_attempts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "draft_letters" ADD CONSTRAINT "draft_letters_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "draft_snapshots" ADD CONSTRAINT "draft_snapshots_draft_id_draft_letters_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_letters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "draft_snapshots" ADD CONSTRAINT "draft_snapshots_rendered_pdf_asset_id_file_assets_id_fk" FOREIGN KEY ("rendered_pdf_asset_id") REFERENCES "public"."file_assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_draft_id_draft_letters_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_letters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_draft_id_draft_letters_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_letters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipient_profiles" ADD CONSTRAINT "recipient_profiles_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sender_profiles" ADD CONSTRAINT "sender_profiles_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_events" ADD CONSTRAINT "support_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_events" ADD CONSTRAINT "support_events_draft_id_draft_letters_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."draft_letters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_draft_id_created_at_idx" ON "conversation_messages" USING btree ("draft_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dispatch_attempts_draft_id_idx" ON "dispatch_attempts" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dispatch_attempts_snapshot_id_idx" ON "dispatch_attempts" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dispatch_attempts_provider_reference_idx" ON "dispatch_attempts" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dispatch_attempts_state_idx" ON "dispatch_attempts" USING btree ("state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dispatch_status_events_attempt_created_idx" ON "dispatch_status_events" USING btree ("dispatch_attempt_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "draft_letters_session_id_idx" ON "draft_letters" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "draft_letters_status_idx" ON "draft_letters" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "draft_letters_created_at_idx" ON "draft_letters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "draft_snapshots_draft_id_idx" ON "draft_snapshots" USING btree ("draft_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "draft_snapshots_draft_id_version_uniq" ON "draft_snapshots" USING btree ("draft_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_assets_session_id_idx" ON "file_assets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_assets_draft_id_idx" ON "file_assets" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "file_assets_kind_status_idx" ON "file_assets" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_draft_id_idx" ON "payment_attempts" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_session_id_idx" ON "payment_attempts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_state_idx" ON "payment_attempts" USING btree ("state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipient_profiles_session_id_idx" ON "recipient_profiles" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sender_profiles_session_id_idx" ON "sender_profiles" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_events_session_id_idx" ON "support_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_events_draft_id_idx" ON "support_events" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_events_event_type_created_at_idx" ON "support_events" USING btree ("event_type","created_at");