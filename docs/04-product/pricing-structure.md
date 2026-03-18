# Pricing Structure

**Status:** Pricing structure and MVP launch amounts are locked.
**See also:** [`auth-billing-accounts.md`](auth-billing-accounts.md), [`email-flows.md`](email-flows.md), [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md), [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)

---

## Objective

Define what checkout must be truthful about with the MVP launch prices locked.

---

## Locked pricing truths

- Pricing is **per letter**, not subscription-based, for MVP.
- Currency is **CHF only**.
- Checkout must show an **itemized breakdown** before redirecting to Stripe.
- The charged amount must be persisted on the `PaymentAttempt`; never recompute historical orders from current config.
- Exact price amounts are **configuration**, not code constants.
- Locked launch prices must still be re-validated against real provider commercial terms before
  public launch.

### Locked MVP launch prices

| Item | Locked amount |
|---|---|
| Standard letter | **CHF 4.90** |
| Registered letter | **CHF 8.90** |

Config keys:
- `PRICE_STANDARD_CENTS=490`
- `PRICE_REGISTERED_CENTS=890`

---

## Checkout price model

The canonical structure is:

1. Base service fee
2. Delivery-type surcharge, if applicable
3. Page-based surcharges, if approved for launch
4. Attachment-related surcharge, only if the chosen dispatch path and pricing policy both support it

The UI may show only the components that are actually enabled. Do not surface optional pricing rows with `CHF 0.00` unless product explicitly wants them shown as "included."

### Locked MVP breakdown

For MVP, the enabled rows are:

1. `Base service fee`
2. `Registered delivery surcharge` only when the user selects registered mail

Locked MVP exclusions:

- no page-count surcharge at launch
- no attachment surcharge at launch
- no coupon/promotion system at launch
- no color-printing pricing tier at launch

## What the launch price covers

The locked launch price is for the full Swiss Mail flow, not only "mailing a PDF."

It may cover:

- AI-assisted drafting
- structured review and editing
- final PDF generation
- dispatch metadata preparation
- provider submission and reconciliation overhead
- payment processing overhead
- support and refund-handling overhead
- provider-side dispatch cost

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

| Situation | Required outcome |
|---|---|
| Dispatch rejected before capture | Cancel the authorization or release the hold |
| Dispatch rejected after capture fallback is in use | Full refund workflow |
| Dispatch status ambiguous | Manual review or reconciliation before refund claim |
| Dispatch accepted and payment captured | No automatic "change of mind" refund path |

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
- Do not model price as independent from provider economics just because the launch values are
  currently locked

Allowed:
- documentation examples that explicitly state the locked MVP amounts
- test fixtures that read the same configured values as production logic

---

## Locked launch pricing summary

| Decision | Status |
|---|---|
| Exact launch amounts | Locked — CHF 4.90 standard / CHF 8.90 registered |
| Whether page-based surcharges are enabled at launch | Locked — no |
| Whether attachment-related surcharges are enabled at launch | Locked — no |
| Whether promotions/coupons exist at launch | Locked — no |
| Business receipt / invoice policy beyond standard payment receipt | Post-MVP unless separately approved |
