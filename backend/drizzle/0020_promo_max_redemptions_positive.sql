-- Tighten the promo cap: a cap of 0 makes a code permanently unusable, which is
-- never intended (the API already requires >= 1). Replace the >= 0 guard from
-- 0019 with a strictly-positive one so direct writes can't create a dead code.

ALTER TABLE promo_codes
  DROP CONSTRAINT IF EXISTS promo_codes_max_redemptions_nonnegative_check;

ALTER TABLE promo_codes
  ADD CONSTRAINT promo_codes_max_redemptions_positive_check
    CHECK (max_redemptions IS NULL OR max_redemptions > 0);
