DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'signature_assurance_level'
  ) THEN
    CREATE TYPE "signature_assurance_level" AS ENUM ('visual', 'advanced', 'qualified');
  END IF;
END $$;

ALTER TYPE "draft_status" ADD VALUE IF NOT EXISTS 'ready_to_sign';

ALTER TABLE "draft_letters"
  ADD COLUMN IF NOT EXISTS "signature_assurance_level" "signature_assurance_level" NOT NULL DEFAULT 'visual';
