# Pricing Structure

**Status:** Pricing structure is locked; exact public launch amounts remain config-backed.
**See also:** [`auth-billing-accounts.md`](auth-billing-accounts.md), [`email-flows.md`](email-flows.md), [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md), [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)

---

## Objective

Define what checkout must be truthful about with provider-quoted pricing plus episto markup.

---

## Locked pricing truths

- Pricing is **per letter**, not subscription-based, for MVP.
- Currency is **CHF only**.
- Checkout must show an **itemized breakdown** before redirecting to Stripe.
- The charged amount must be persisted on the `PaymentAttempt`; never recompute historical orders from current config.
- Exact price amounts are **stored snapshot / configuration inputs**, not code constants.
- The public pricing page and in-product public price display must read the same stored synced provider source.
- Provider economics must still be re-validated against real commercial terms before public launch.

### Locked MVP price model

**Status:** Locked for implementation.

The exact charged amount is:

1. provider quote for the actual draft via ePost preview
2. plus a configurable episto markup

Config keys:

- `PRICE_STANDARD_MARKUP_CENTS`
- `PRICE_REGISTERED_MARKUP_CENTS`

Public pricing surfaces may show reference totals from the latest stored synced provider snapshot,
but checkout must use the draft-specific provider quote.

Display-pricing source rules:

- public pricing and blank-draft display pricing read the stored provider rate matrix only
- the stored matrix is refreshed on a daily schedule and may continue to show the last successful
  matrix while a refresh is stale or temporarily failing
- checkout and payment creation must never charge from the stored matrix; they must keep using the
  live draft-specific provider quote

---

## Checkout price model

The canonical structure is:

1. Provider quote
2. episto markup
3. Any future approved provider-dependent surcharges

The UI may show only the components that are actually enabled. Do not surface optional pricing rows with `CHF 0.00` unless product explicitly wants them shown as "included."

### Locked MVP breakdown

For MVP, the enabled rows are:

1. `Provider quote`
2. `episto service`

Locked MVP exclusions:

- no extra page-count surcharge layered on top of the provider quote at launch
- no independent attachment surcharge layered on top of the provider quote at launch
- ~~no coupon/promotion system at launch~~ — **reversed 2026-07-28**, see
  [_Promotions — reversal of the no-coupon lock_](#promotions--reversal-of-the-no-coupon-lock-2026-07-28)
- no color-printing pricing tier at launch

## What the launch price covers

The charged amount is for the full episto flow, not only "mailing a PDF."

It may cover:

- AI-assisted drafting
- structured review and editing
- final PDF generation
- dispatch preparation
- postal submission handling
- payment processing overhead
- receipt, support, and refund-handling overhead
- provider-side dispatch cost

**Note on operational cost:** The launch price must cover not just the provider fee, but the cost of
reconciliation, potential manual support touchpoints, and payment processing fees.

It does not include:

- legal review
- guaranteed delivery
- guaranteed tracking
- custom document design work

---

## Stripe checkout truth

Stripe is locked as the payment provider. The product flow is:

1. User completes review and enters required checkout email
2. Backend creates a Stripe PaymentIntent with `capture_method: 'manual'`
3. User completes payment via embedded `<PaymentElement>` (Stripe Elements)
4. Stripe confirms payment authorization (hold placed, not yet captured)
5. Backend submits the dispatch request
6. Backend captures payment only after deterministic provider acceptance
7. If deterministic acceptance never happens or the provider rejects, cancel the authorization or refund per the locked payment model

Do not document or implement the Stripe flow as "pay first, dispatch later" unless the fallback path in
[`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md) is explicitly activated for the chosen provider.

---

## Receipt and confirmation rules

The receipt and confirmation surfaces must stay separate:

- **Payment receipt:** payment truth only
- **Dispatch confirmation:** dispatch truth only

The receipt must include:

- internal order/payment reference
- charged amount in CHF
- itemized breakdown
- sender name
- recipient name only, not full address
- delivery type
- refund wording that matches the actual policy

The receipt must not:

- claim provider acceptance unless dispatch is actually accepted
- claim delivery to the recipient
- include letter body content
- include full recipient address in email

---

## Refund policy truth

Refund wording must reflect the canonical states, not optimistic UI assumptions.

| Situation                                          | Required outcome                                    |
| -------------------------------------------------- | --------------------------------------------------- |
| Dispatch rejected before capture                   | Cancel the authorization or release the hold        |
| Dispatch rejected after capture fallback is in use | Full refund workflow                                |
| Dispatch status ambiguous                          | Manual review or reconciliation before refund claim |
| Dispatch accepted and payment captured             | No automatic "change of mind" refund path           |

Only call a refund complete once Stripe confirms it. Support and UI copy must distinguish:

- `refund_pending`
- `refunded`
- `partially_refunded`

---

## Storage and formatting rules

- Store money as integer cents
- Format all customer-facing amounts through a shared CHF formatter
- Never embed launch prices directly in component logic or backend business logic
- Keep pricing config versioned and auditable
- Do not model price as independent from provider economics

Allowed:

- documentation examples that explicitly state the locked MVP amounts
- test fixtures that read the same configured values as production logic

---

## Locked launch pricing summary

| Decision                                                          | Status                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| Exact launch amounts                                              | Locked as config-backed provider quote plus episto markup        |
| Whether page-based surcharges are enabled at launch               | Locked — no                                                      |
| Whether attachment-related surcharges are enabled at launch       | Locked — no                                                      |
| Whether promotions/coupons exist at launch                        | ~~Locked — no~~ · **reversed 2026-07-28 — promo codes are live** |
| Business receipt / invoice policy beyond standard payment receipt | Post-MVP unless separately approved                              |

---

## Promotions — reversal of the no-coupon lock (2026-07-28)

The launch decision was "no coupon/promotion system". That decision is **reversed**, explicitly and
with a date, because a promo-code system has shipped. The original lock is left visible above rather
than deleted.

**What shipped:**

- A `promo_codes` table (`backend/src/db/schema/promos.ts:17`) with a `promo_kind` enum of
  `free | percent | fixed` (`:15`) and per-code `active`, `expiresAt`, `maxRedemptions`, and
  `redeemedCount` fields.
- Discount computation in `backend/src/modules/payments/promo.service.ts:42`
  (`applyPromoToTotal`), which rejects unknown or inactive codes (`:62`), expired codes (`:63`),
  and codes that have reached their redemption cap (`:64`).
- Redemption accounting in the same file at `:89` (`recordPromoRedemption`), which consumes a
  redemption under a conditional update re-checking `active`, expiry, and the cap in one statement
  (`:103`–`:107`).
- Checkout acceptance of an optional `promoCode` field
  (`backend/src/modules/payments/payment-checkout.routes.ts:35`), applied at `:120`–`:122`.
- Administration at `backend/src/modules/admin/admin-promos.routes.ts:35`, with the operator UI at
  `frontend/src/app/[locale]/admin/promos/page.tsx` and the customer-facing field at
  `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx:374`.

**Constraints that remain locked:**

- **Validation and discount application are server-side only.** The client submits nothing but a
  code string; the charged total is recomputed in the checkout route before the Stripe payment
  intent is created. No discounted amount supplied by a client is ever trusted.
- Individual promo codes are configuration data held in the database, not constants in code. This
  is consistent with the standing rule that price amounts are configuration inputs.
- The charged amount persisted on the payment record remains the authoritative figure for receipts,
  refunds, and support; a promotion changes that figure at checkout time and is not reapplied to
  historical orders.
- The remaining launch exclusions — page-count surcharge, attachment surcharge, colour-printing
  tier — are untouched by this reversal.
