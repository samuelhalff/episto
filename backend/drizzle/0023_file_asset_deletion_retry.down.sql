DROP INDEX IF EXISTS file_assets_pending_deletion_idx;

ALTER TABLE file_assets
  DROP COLUMN IF EXISTS deletion_failed_at;
