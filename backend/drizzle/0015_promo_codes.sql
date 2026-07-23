-- Promo / discount codes for launch mechanics (free letters, referral/partner
-- codes). Discounts are always recomputed and enforced server-side.
CREATE TYPE promo_kind AS ENUM ('free', 'percent', 'fixed');

CREATE TABLE promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind promo_kind NOT NULL,
  value integer NOT NULL DEFAULT 0,
  max_redemptions integer,
  redeemed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX promo_codes_code_idx ON promo_codes (code);
