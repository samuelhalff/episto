-- Attachment ingestion: cache the assistant-readable text extracted from an
-- uploaded document so it can be injected into the drafting context. Text is
-- extracted once per file (never re-parsed); status drives the UI + injection.

ALTER TABLE file_assets
  ADD COLUMN extraction_status text,
  ADD COLUMN extracted_text text,
  ADD COLUMN extraction_page_count integer,
  ADD COLUMN extracted_at timestamptz;

ALTER TABLE file_assets
  ADD CONSTRAINT file_assets_extraction_status_check
    CHECK (extraction_status IS NULL OR extraction_status IN
      ('pending', 'extracted', 'empty', 'unsupported', 'failed'));
