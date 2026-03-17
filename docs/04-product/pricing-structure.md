# Pricing Structure

**Status:** Pricing structure is decided. Exact public amounts remain open until launch approval.
**See also:** [`auth-billing-accounts.md`](auth-billing-accounts.md), [`email-flows.md`](email-flows.md), [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md)

---

## Objective

Define what checkout must be truthful about without freezing launch prices before approval.

---

## Locked pricing truths

- Pricing is **per letter**, not subscription-based, for MVP.
- Currency is **CHF only**.
- Checkout must show an **itemized breakdown** before redirecting to Stripe.
- The charged amount must be persisted on the `PaymentAttempt`; never recompute historical orders from current config.
- Exact price amounts are **configuration**, not code constants.

---

## Checkout price model

The canonical structure is:

1. Base service fee
2. Delivery-type surcharge, if applicable
3. Page-based surcharges, if approved for launch
4. Attachment-related surcharge, only if the chosen dispatch path and pricing policy both support it

The UI may show only the components that are actually enabled. Do not surface optional pricing rows with `CHF 0.00` unless product explicitly wants them shown as "included."

### What is still open

- Exact launch amounts for every row
- Whether attachment pages affect price at launch
- Whether color printing exists at launch
- Whether any launch promotions or coupons exist

If a component is still open, keep it out of production-facing UI and config until it is approved.

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
- Never embed launch prices directly in product copy, tests, or component logic
- Keep pricing config versioned and auditable

---

## Open decisions

| Decision | Status |
|---|---|
| Exact launch amounts | Open — CHF 4.90 standard / CHF 8.90 registered recommended (see [`open-decisions.md`](../08-guardrails/open-decisions.md) §1) |
| Whether page-based surcharges are enabled at launch | Open |
| Whether attachment-related surcharges are enabled at launch | Open |
| Whether promotions/coupons exist at launch | Open |
| Business receipt / invoice policy beyond standard payment receipt | Post-MVP unless separately approved |
