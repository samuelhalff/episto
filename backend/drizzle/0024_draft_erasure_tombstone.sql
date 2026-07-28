-- Erasure tombstone.
--
-- Before this, nothing recorded that a draft had been erased, so a request or
-- an AI job that loaded the draft before erasure could write its body, its
-- metadata or a new message back afterwards. Azure drafting calls run for tens
-- of seconds, so that window is real, not theoretical.
--
-- Enforcement lives in the database rather than in each of the ~15 service
-- write paths. An application-side check is a check-then-write: it can be
-- forgotten by the next writer, and without a row lock it loses the race it is
-- meant to win. The trigger below takes `FOR SHARE` on the draft row, so a
-- writer racing an erasure blocks until the erasure commits and then sees the
-- tombstone.
--
-- The rule the triggers encode: once a draft is erased, the only write it will
-- accept is another write that removes data.

ALTER TABLE "draft_letters" ADD COLUMN "erasure_requested_at" timestamptz;

-- Retention and dispatch both ask "is anything still waiting to go out for
-- this draft" on every sweep.
CREATE INDEX "dispatch_attempts_queued_draft_idx"
  ON "dispatch_attempts" ("draft_id")
  WHERE "state" = 'queued' AND "submitted_at" IS NULL;

--> statement-breakpoint

CREATE FUNCTION "assert_draft_not_erased"() RETURNS trigger AS $$
DECLARE
  erased timestamptz;
BEGIN
  IF NEW."draft_id" IS NULL THEN
    RETURN NEW;
  END IF;

  -- FOR SHARE, not a plain read: this is what makes the check race-free. An
  -- erasure holds the row exclusively while it works, so this blocks until it
  -- commits and then reads the tombstone it just wrote.
  SELECT "erasure_requested_at" INTO erased
  FROM "draft_letters"
  WHERE "id" = NEW."draft_id"
  FOR SHARE;

  IF erased IS NOT NULL THEN
    RAISE EXCEPTION 'draft % was erased at %', NEW."draft_id", erased
      USING ERRCODE = 'ZE001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

CREATE TRIGGER "conversation_messages_erasure_guard"
  BEFORE INSERT ON "conversation_messages"
  FOR EACH ROW EXECUTE FUNCTION "assert_draft_not_erased"();

CREATE TRIGGER "draft_snapshots_erasure_guard"
  BEFORE INSERT ON "draft_snapshots"
  FOR EACH ROW EXECUTE FUNCTION "assert_draft_not_erased"();

CREATE TRIGGER "file_assets_erasure_guard"
  BEFORE INSERT ON "file_assets"
  FOR EACH ROW EXECUTE FUNCTION "assert_draft_not_erased"();

CREATE TRIGGER "dispatch_attempts_erasure_guard"
  BEFORE INSERT ON "dispatch_attempts"
  FOR EACH ROW EXECUTE FUNCTION "assert_draft_not_erased"();

CREATE TRIGGER "payment_attempts_erasure_guard"
  BEFORE INSERT ON "payment_attempts"
  FOR EACH ROW EXECUTE FUNCTION "assert_draft_not_erased"();

CREATE TRIGGER "draft_quote_cache_erasure_guard"
  BEFORE INSERT ON "draft_quote_cache"
  FOR EACH ROW EXECUTE FUNCTION "assert_draft_not_erased"();

--> statement-breakpoint

-- `setSnapshotPdfAsset` reads the snapshot JSON, adds a page count and writes
-- the whole document back. On an erased draft that resurrects every address
-- and the letter body, so snapshot UPDATEs need the guard too — except the
-- scrubbing update erasure itself performs.
CREATE FUNCTION "assert_snapshot_not_erased"() RETURNS trigger AS $$
DECLARE
  erased timestamptz;
BEGIN
  IF NEW."snapshot_data" = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  SELECT "erasure_requested_at" INTO erased
  FROM "draft_letters"
  WHERE "id" = NEW."draft_id"
  FOR SHARE;

  IF erased IS NOT NULL THEN
    RAISE EXCEPTION 'draft % was erased at %', NEW."draft_id", erased
      USING ERRCODE = 'ZE001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "draft_snapshots_update_erasure_guard"
  BEFORE UPDATE ON "draft_snapshots"
  FOR EACH ROW EXECUTE FUNCTION "assert_snapshot_not_erased"();

--> statement-breakpoint

-- The draft row itself. Re-running an erasure has to stay possible, so a write
-- that leaves the content columns empty is always allowed; anything else on a
-- tombstoned draft is a stale writer.
CREATE FUNCTION "assert_draft_letter_not_erased"() RETURNS trigger AS $$
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

CREATE TRIGGER "draft_letters_erasure_guard"
  BEFORE UPDATE ON "draft_letters"
  FOR EACH ROW EXECUTE FUNCTION "assert_draft_letter_not_erased"();
