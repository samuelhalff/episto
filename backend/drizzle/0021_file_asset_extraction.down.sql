ALTER TABLE file_assets
  DROP CONSTRAINT IF EXISTS file_assets_extraction_status_check;

ALTER TABLE file_assets
  DROP COLUMN IF EXISTS extraction_status,
  DROP COLUMN IF EXISTS extracted_text,
  DROP COLUMN IF EXISTS extraction_page_count,
  DROP COLUMN IF EXISTS extracted_at;
