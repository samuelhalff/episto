ALTER TABLE payment_attempts
  DROP CONSTRAINT IF EXISTS payment_attempts_amount_nonnegative_check;

ALTER TABLE promo_codes
  DROP CONSTRAINT IF EXISTS promo_codes_value_nonnegative_check,
  DROP CONSTRAINT IF EXISTS promo_codes_redeemed_nonnegative_check,
  DROP CONSTRAINT IF EXISTS promo_codes_max_redemptions_nonnegative_check,
  DROP CONSTRAINT IF EXISTS promo_codes_percent_range_check;
