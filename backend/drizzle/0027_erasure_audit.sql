-- What survives an erasure.
--
-- FADP/GDPR both want a record that an erasure happened — who asked, when, how
-- much was removed, what had to be kept. The obvious place was `support_events`,
-- and it was the wrong one: that table carries `session_id`, `draft_id` and a
-- free-text `details` blob, so the audit trail of an erasure would itself have
-- been a pointer back to the person who asked to be forgotten.
--
-- This table has no foreign keys and no free text. `subject_digest` is an HMAC
-- of the session id, which lets support answer "was this session erased?" when
-- they still hold the id, and answers nothing at all to someone who reads the
-- table.

CREATE TABLE "erasure_audits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject_digest" text NOT NULL,
  "key_version" integer DEFAULT 1 NOT NULL,
  "requested_by" text NOT NULL,
  "drafts_erased" integer DEFAULT 0 NOT NULL,
  "orders_retained" integer DEFAULT 0 NOT NULL,
  "files_marked" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "erasure_audits_subject_digest_idx" ON "erasure_audits" ("subject_digest");
CREATE INDEX "erasure_audits_created_at_idx" ON "erasure_audits" ("created_at");

--> statement-breakpoint

-- Tighten the draft tombstone guard.
--
-- The first version allowed any update to an erased draft as long as the six
-- content columns came out null. A stale writer could still repoint the draft
-- at a fresh profile, or move its status, and the guard would wave it through.
-- An erased draft accepts writes that remove data — nothing else.

-- Enumerating the frozen columns was the first attempt and it does not hold:
-- the table has twenty-odd of them, and the next migration to add one adds a
-- hole. This compares the whole row instead, minus the columns an erasure is
-- allowed to move — so a new column is frozen by default, which is the safe
-- direction to be wrong in.
CREATE OR REPLACE FUNCTION "assert_draft_letter_not_erased"() RETURNS trigger AS $$
DECLARE
  mutable text[] := ARRAY[
    'subject', 'body', 'tone', 'intent', 'enclosure_note', 'metadata', 'updated_at'
  ];
BEGIN
  IF OLD."erasure_requested_at" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW."erasure_requested_at" = OLD."erasure_requested_at"
     AND NEW."subject" IS NULL
     AND NEW."body" IS NULL
     AND NEW."tone" IS NULL
     AND NEW."intent" IS NULL
     AND NEW."enclosure_note" IS NULL
     AND NEW."metadata" IS NULL
     AND to_jsonb(NEW) - mutable = to_jsonb(OLD) - mutable
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'draft % was erased at %', NEW."id", OLD."erasure_requested_at"
    USING ERRCODE = 'ZE001';
END;
$$ LANGUAGE plpgsql;
