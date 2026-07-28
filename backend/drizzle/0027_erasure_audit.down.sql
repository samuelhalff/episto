DROP TABLE IF EXISTS "erasure_audits";

--> statement-breakpoint

-- Restore the permissive tombstone guard from 0024.
CREATE OR REPLACE FUNCTION "assert_draft_letter_not_erased"() RETURNS trigger AS $$
BEGIN
  IF OLD."erasure_requested_at" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW."erasure_requested_at" IS NOT NULL
     AND NEW."subject" IS NULL
     AND NEW."body" IS NULL
     AND NEW."tone" IS NULL
     AND NEW."intent" IS NULL
     AND NEW."enclosure_note" IS NULL
     AND NEW."metadata" IS NULL
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'draft % was erased at %', NEW."id", OLD."erasure_requested_at"
    USING ERRCODE = 'ZE001';
END;
$$ LANGUAGE plpgsql;
