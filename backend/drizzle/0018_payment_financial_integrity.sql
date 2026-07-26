-- Financial integrity: immutable capture time + actual Stripe fee on the
-- payment, and one lifecycle row per Stripe Refund. Reports derive from these
-- dated accounting events instead of the mutable payment state/updated_at.

ALTER TABLE payment_attempts
  ADD COLUMN captured_at timestamptz,
  ADD COLUMN captured_at_source text,
  ADD COLUMN stripe_balance_transaction_id text,
  ADD COLUMN stripe_fee_cents integer,
  ADD COLUMN stripe_fee_currency text,
  ADD COLUMN stripe_fee_recorded_at timestamptz;

ALTER TABLE payment_attempts
  ADD CONSTRAINT payment_attempts_captured_at_source_check
    CHECK (captured_at_source IS NULL OR captured_at_source IN
      ('webhook', 'local_capture', 'stripe_backfill', 'receipt_backfill')),
  ADD CONSTRAINT payment_attempts_capture_pair_check
    CHECK ((captured_at IS NULL) = (captured_at_source IS NULL)),
  ADD CONSTRAINT payment_attempts_stripe_fee_nonnegative_check
    CHECK (stripe_fee_cents IS NULL OR stripe_fee_cents >= 0),
  ADD CONSTRAINT payment_attempts_stripe_fee_pair_check
    CHECK (
      (stripe_fee_cents IS NULL AND stripe_fee_currency IS NULL AND stripe_fee_recorded_at IS NULL)
      OR
      (stripe_fee_cents IS NOT NULL AND stripe_fee_currency IS NOT NULL
       AND stripe_fee_recorded_at IS NOT NULL)
    );

CREATE UNIQUE INDEX payment_attempts_stripe_balance_transaction_id_uidx
  ON payment_attempts (stripe_balance_transaction_id)
  WHERE stripe_balance_transaction_id IS NOT NULL;
CREATE INDEX payment_attempts_captured_at_idx
  ON payment_attempts (captured_at)
  WHERE captured_at IS NOT NULL;

CREATE TABLE payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_attempt_id uuid NOT NULL REFERENCES payment_attempts(id),
  stripe_refund_id text NOT NULL UNIQUE,
  stripe_charge_id text NOT NULL,
  stripe_balance_transaction_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency = 'CHF'),
  status text NOT NULL CHECK (status IN
    ('pending', 'requires_action', 'succeeded', 'failed', 'canceled')),
  refund_net_cents integer,
  refund_vat_cents integer,
  stripe_fee_cents integer CHECK (stripe_fee_cents IS NULL OR stripe_fee_cents >= 0),
  reason text,
  failure_reason text,
  initiated_by text,
  stripe_created_at timestamptz NOT NULL,
  refunded_at timestamptz,
  failed_at timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_refunds_tax_amount_check CHECK (
    (refund_net_cents IS NULL AND refund_vat_cents IS NULL)
    OR
    (refund_net_cents >= 0 AND refund_vat_cents >= 0
     AND refund_net_cents + refund_vat_cents = amount_cents)
  ),
  CONSTRAINT payment_refunds_succeeded_timestamp_check CHECK (
    status <> 'succeeded'
    OR (refunded_at IS NOT NULL AND refund_net_cents IS NOT NULL
        AND refund_vat_cents IS NOT NULL)
  )
);

CREATE INDEX payment_refunds_payment_attempt_id_idx
  ON payment_refunds (payment_attempt_id);
CREATE INDEX payment_refunds_refunded_at_idx
  ON payment_refunds (refunded_at)
  WHERE refunded_at IS NOT NULL;
CREATE INDEX payment_refunds_status_idx ON payment_refunds (status);

-- Best available local evidence: a receipt can only have been issued after
-- capture. Explicitly marked approximate; never use payment created_at (that is
-- checkout creation) and never mutable updated_at (it may be a later refund).
UPDATE payment_attempts p
SET captured_at = r.created_at,
    captured_at_source = 'receipt_backfill'
FROM receipts r
WHERE r.payment_attempt_id = p.id
  AND p.captured_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM monthly_fixed_costs
    WHERE year_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
       OR amount_cents < 0
       OR char_length(note) > 500
  ) THEN
    RAISE EXCEPTION 'Invalid monthly_fixed_costs rows must be corrected before migration 0018';
  END IF;
END $$;

ALTER TABLE monthly_fixed_costs
  ADD CONSTRAINT monthly_fixed_costs_year_month_check
    CHECK (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT monthly_fixed_costs_amount_nonnegative_check
    CHECK (amount_cents >= 0),
  ADD CONSTRAINT monthly_fixed_costs_note_length_check
    CHECK (note IS NULL OR char_length(note) <= 500);
