-- Legacy signature-interest waitlist and per-step product analytics columns.
-- Idempotent so it is safe to re-run on every backend startup.

CREATE TABLE IF NOT EXISTS "qes_waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid REFERENCES "sessions"("id"),
  "email" text NOT NULL,
  "locale" text,
  "source" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "qes_waitlist_email_idx" ON "qes_waitlist" ("email");
CREATE INDEX IF NOT EXISTS "qes_waitlist_created_at_idx" ON "qes_waitlist" ("created_at");

CREATE TABLE IF NOT EXISTS "product_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" text NOT NULL,
  "session_id" uuid,
  "draft_id" uuid,
  "locale" text,
  "route" text,
  "source" text,
  "template_slug" text,
  "surface" text,
  "step" text,
  "duration_ms" integer,
  "error_family" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "product_events_event_name_time_idx"
  ON "product_events" ("event_name", "created_at");
CREATE INDEX IF NOT EXISTS "product_events_session_idx"
  ON "product_events" ("session_id", "created_at");

ALTER TABLE "product_events"
  ADD COLUMN IF NOT EXISTS "step" text,
  ADD COLUMN IF NOT EXISTS "draft_id" uuid;

CREATE INDEX IF NOT EXISTS "product_events_step_time_idx"
  ON "product_events" ("step", "created_at");
CREATE INDEX IF NOT EXISTS "product_events_draft_id_idx"
  ON "product_events" ("draft_id");
