ALTER TABLE "draft_letters"
  DROP COLUMN IF EXISTS "signature_assurance_level";

UPDATE "draft_letters"
SET "status" = 'ready'
WHERE "status" = 'ready_to_sign';

ALTER TYPE "draft_status" RENAME TO "draft_status_old";

CREATE TYPE "draft_status" AS ENUM (
  'collecting',
  'fields_complete',
  'reviewed',
  'rendering',
  'ready',
  'submitted',
  'dispatched',
  'closed'
);

ALTER TABLE "draft_letters"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "draft_letters"
  ALTER COLUMN "status" TYPE "draft_status"
  USING ("status"::text::"draft_status");

ALTER TABLE "draft_letters"
  ALTER COLUMN "status" SET DEFAULT 'collecting';

DROP TYPE "draft_status_old";

DROP TYPE IF EXISTS "signature_assurance_level";
