-- Manual monthly fixed operating costs (opex) for the admin P&L bottom line.
--
-- One row per calendar month (YYYY-MM). This is a mutable admin INPUT, not a
-- frozen per-order cost basis: it lets the Financials page reach a real
-- operating result. Amounts are CHF cents.
CREATE TABLE monthly_fixed_costs (
  year_month text PRIMARY KEY,
  amount_cents integer NOT NULL,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
