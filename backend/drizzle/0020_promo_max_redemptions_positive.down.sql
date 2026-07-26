ALTER TABLE promo_codes
  DROP CONSTRAINT IF EXISTS promo_codes_max_redemptions_positive_check;

ALTER TABLE promo_codes
  ADD CONSTRAINT promo_codes_max_redemptions_nonnegative_check
    CHECK (max_redemptions IS NULL OR max_redemptions >= 0);
