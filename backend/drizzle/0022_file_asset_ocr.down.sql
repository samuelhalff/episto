ALTER TABLE file_assets
  DROP CONSTRAINT IF EXISTS file_assets_extraction_engine_check,
  DROP CONSTRAINT IF EXISTS file_assets_extraction_status_check;

ALTER TABLE file_assets
  ADD CONSTRAINT file_assets_extraction_status_check
    CHECK (extraction_status IS NULL OR extraction_status IN
      ('pending', 'extracted', 'empty', 'unsupported', 'failed'));

ALTER TABLE file_assets
  DROP COLUMN IF EXISTS extraction_engine;
