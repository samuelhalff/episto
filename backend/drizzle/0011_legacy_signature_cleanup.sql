UPDATE "draft_letters"
SET "signature_assurance_level" = 'advanced'
WHERE "signature_assurance_level"::text = 'qualified';

UPDATE "draft_letters"
SET "signature_flow_mode" = 'swisssign_ses'
WHERE "signature_flow_mode"::text = 'swisssign_qes';

UPDATE "signature_sessions"
SET "signature_flow_mode" = 'swisssign_ses'
WHERE "signature_flow_mode"::text = 'swisssign_qes';

DROP TABLE IF EXISTS "qes_waitlist";

ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_assurance_level" DROP DEFAULT;

CREATE TYPE "signature_assurance_level_next" AS ENUM ('visual', 'advanced');

ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_assurance_level" TYPE "signature_assurance_level_next"
  USING "signature_assurance_level"::text::"signature_assurance_level_next";

DROP TYPE "signature_assurance_level";

ALTER TYPE "signature_assurance_level_next" RENAME TO "signature_assurance_level";

ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_assurance_level" SET DEFAULT 'visual';

ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" DROP DEFAULT;

CREATE TYPE "signature_flow_mode_next" AS ENUM ('none', 'visual', 'swisssign_ses');

ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" TYPE "signature_flow_mode_next"
  USING "signature_flow_mode"::text::"signature_flow_mode_next";

ALTER TABLE "signature_sessions"
  ALTER COLUMN "signature_flow_mode" TYPE "signature_flow_mode_next"
  USING "signature_flow_mode"::text::"signature_flow_mode_next";

DROP TYPE "signature_flow_mode";

ALTER TYPE "signature_flow_mode_next" RENAME TO "signature_flow_mode";

ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" SET DEFAULT 'visual';
