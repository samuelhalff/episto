-- Local verification only. Production rolls forward — running this discards the
-- acquisition history for every order already captured.
DROP INDEX IF EXISTS payment_attempts_attribution_source_idx;

ALTER TABLE payment_attempts
  DROP CONSTRAINT IF EXISTS payment_attempts_attribution_length_check,
  DROP CONSTRAINT IF EXISTS payment_attempts_ga_client_id_length_check,
  DROP COLUMN IF EXISTS attribution_utm_campaign,
  DROP COLUMN IF EXISTS attribution_utm_medium,
  DROP COLUMN IF EXISTS attribution_utm_source,
  DROP COLUMN IF EXISTS attribution_gclid,
  DROP COLUMN IF EXISTS ga_client_id;
