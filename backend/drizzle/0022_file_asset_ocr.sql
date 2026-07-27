-- Attachment ingestion, phase 2: OCR for scans/photos. Track which engine read
-- the file (for the per-session OCR budget) and widen the status vocabulary so
-- the UI can explain precisely why a document could or could not be read.

ALTER TABLE file_assets
  ADD COLUMN extraction_engine text;

ALTER TABLE file_assets
  DROP CONSTRAINT IF EXISTS file_assets_extraction_status_check;

ALTER TABLE file_assets
  ADD CONSTRAINT file_assets_extraction_status_check
    CHECK (extraction_status IS NULL OR extraction_status IN
      ('pending', 'ocr_running', 'extracted', 'empty', 'unsupported',
       'no_ocr', 'too_long', 'budget', 'failed')),
  ADD CONSTRAINT file_assets_extraction_engine_check
    CHECK (extraction_engine IS NULL OR extraction_engine IN ('text', 'ocr'));
