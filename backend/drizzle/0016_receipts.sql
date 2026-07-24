-- Swiss VAT receipts (Quittung / Reçu / Ricevuta / Receipt). One immutable
-- receipt per captured payment attempt. Prices are VAT-inclusive at 8.1%.
--
-- Receipts are intentionally NOT modelled as file_assets: they must survive the
-- content/PDF retention cleanup indefinitely for accounting/audit purposes, so
-- the PDF is referenced only by this table + its S3 storage_key.
CREATE SEQUENCE receipt_number_seq;

CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_attempt_id uuid NOT NULL UNIQUE REFERENCES payment_attempts(id),
  receipt_number text NOT NULL UNIQUE,
  net_cents integer NOT NULL,
  vat_cents integer NOT NULL,
  total_cents integer NOT NULL,
  vat_rate_bp integer NOT NULL DEFAULT 810,
  currency text NOT NULL DEFAULT 'CHF',
  discount_cents integer NOT NULL DEFAULT 0,
  promo_code text,
  delivery_type text,
  order_ref text NOT NULL,
  storage_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX receipts_payment_attempt_id_idx ON receipts (payment_attempt_id);
