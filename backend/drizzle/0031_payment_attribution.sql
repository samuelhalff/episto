-- Where a paying customer actually came from.
--
-- GA4 already receives a `purchase` from the confirmation page, but only when
-- the customer granted analytics consent, ran no blocker and stayed on the page
-- long enough for it to mount. Everyone else is a real order that GA4 never
-- sees, so channel revenue — and therefore CAC, which the business runs at
-- roughly CHF 2.30 — is under-counted by an unknown amount. Recording the
-- acquisition parameters on the payment itself makes the answer come from our
-- own ledger rather than from whatever survived the browser, and gives the
-- server-side Measurement Protocol send the `client_id` it needs to land in the
-- right channel instead of polluting reporting as an unattributed direct hit.
--
-- All five columns are nullable by design: no analytics consent means no
-- capture at all (see the frontend attribution module), and a NULL here is the
-- honest record of that. It is never backfilled or guessed.

ALTER TABLE payment_attempts
  ADD COLUMN ga_client_id text,
  ADD COLUMN attribution_gclid text,
  ADD COLUMN attribution_utm_source text,
  ADD COLUMN attribution_utm_medium text,
  ADD COLUMN attribution_utm_campaign text;

-- These arrive from the browser, so they are attacker-controlled free text.
-- The zod schema at the route bounds them too; the constraint is what stops a
-- future call site from writing an unbounded blob into the payments table.
ALTER TABLE payment_attempts
  ADD CONSTRAINT payment_attempts_ga_client_id_length_check
    CHECK (ga_client_id IS NULL OR char_length(ga_client_id) <= 64),
  ADD CONSTRAINT payment_attempts_attribution_length_check
    CHECK (
      (attribution_gclid IS NULL OR char_length(attribution_gclid) <= 256)
      AND (attribution_utm_source IS NULL OR char_length(attribution_utm_source) <= 128)
      AND (attribution_utm_medium IS NULL OR char_length(attribution_utm_medium) <= 128)
      AND (attribution_utm_campaign IS NULL OR char_length(attribution_utm_campaign) <= 128)
    );

-- The only query these columns serve is "group the paid orders by channel",
-- which scans the captured rows. Partial so unattributed payments (the majority
-- while consent uptake is low) cost nothing to index.
CREATE INDEX payment_attempts_attribution_source_idx
  ON payment_attempts (attribution_utm_source)
  WHERE attribution_utm_source IS NOT NULL;
