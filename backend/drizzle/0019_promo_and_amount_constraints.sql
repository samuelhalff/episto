-- Data-integrity guards for promo codes and payment amounts. Reserve-at-creation
-- promo accounting and the money math both assume these invariants; enforce them
-- at the storage layer so bad admin input or a logic bug can't corrupt totals.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM promo_codes
    WHERE value < 0
       OR redeemed_count < 0
       OR (max_redemptions IS NOT NULL AND max_redemptions < 0)
       OR (kind = 'percent' AND (value < 0 OR value > 100))
  ) THEN
    RAISE EXCEPTION 'Invalid promo_codes rows must be corrected before migration 0019';
  END IF;
  IF EXISTS (SELECT 1 FROM payment_attempts WHERE amount_cents < 0) THEN
    RAISE EXCEPTION 'Negative payment_attempts.amount_cents must be corrected before migration 0019';
  END IF;
END $$;

ALTER TABLE promo_codes
  ADD CONSTRAINT promo_codes_value_nonnegative_check
    CHECK (value >= 0),
  ADD CONSTRAINT promo_codes_redeemed_nonnegative_check
    CHECK (redeemed_count >= 0),
  ADD CONSTRAINT promo_codes_max_redemptions_nonnegative_check
    CHECK (max_redemptions IS NULL OR max_redemptions >= 0),
  ADD CONSTRAINT promo_codes_percent_range_check
    CHECK (kind <> 'percent' OR (value >= 0 AND value <= 100));

ALTER TABLE payment_attempts
  ADD CONSTRAINT payment_attempts_amount_nonnegative_check
    CHECK (amount_cents >= 0);
