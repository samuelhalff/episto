-- Retention, phase 2: make a failed physical deletion retryable and fair.
--
-- The cleanup worker takes the first N rows in `pending_deletion` every run. An
-- asset whose object cannot be deleted (storage down, key gone strange) was
-- therefore re-picked at the head of every run, so once N such rows existed
-- nothing behind them was ever collected. Recording the failure lets the worker
-- serve never-tried rows first and rotate through the failures behind them.

ALTER TABLE file_assets
  ADD COLUMN deletion_failed_at timestamptz;

CREATE INDEX IF NOT EXISTS file_assets_pending_deletion_idx
  ON file_assets (deletion_failed_at NULLS FIRST, created_at)
  WHERE status = 'pending_deletion';
