-- Local verification only. Production rolls forward — running this after any
-- refund row exists destroys the refund ledger.
ALTER TABLE monthly_fixed_costs
  DROP CONSTRAINT IF EXISTS monthly_fixed_costs_note_length_check,
  DROP CONSTRAINT IF EXISTS monthly_fixed_costs_amount_nonnegative_check,
  DROP CONSTRAINT IF EXISTS monthly_fixed_costs_year_month_check;

DROP TABLE IF EXISTS payment_refunds;
DROP INDEX IF EXISTS payment_attempts_captured_at_idx;
DROP INDEX IF EXISTS payment_attempts_stripe_balance_transaction_id_uidx;

ALTER TABLE payment_attempts
  DROP CONSTRAINT IF EXISTS payment_attempts_stripe_fee_pair_check,
  DROP CONSTRAINT IF EXISTS payment_attempts_stripe_fee_nonnegative_check,
  DROP CONSTRAINT IF EXISTS payment_attempts_capture_pair_check,
  DROP CONSTRAINT IF EXISTS payment_attempts_captured_at_source_check,
  DROP COLUMN IF EXISTS stripe_fee_recorded_at,
  DROP COLUMN IF EXISTS stripe_fee_currency,
  DROP COLUMN IF EXISTS stripe_fee_cents,
  DROP COLUMN IF EXISTS stripe_balance_transaction_id,
  DROP COLUMN IF EXISTS captured_at_source,
  DROP COLUMN IF EXISTS captured_at;
