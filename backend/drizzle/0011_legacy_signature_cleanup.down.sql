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
