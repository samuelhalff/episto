# Email Notifications and Stripe Receipt Cleanup — Design

**Status:** Approved for planning  
**Date:** 2026-04-11

## Problem

The current post-payment email flow mixes three different concerns:

1. Stripe's payment receipt
2. A Swiss Mail "dispatch confirmation / order confirmed" email
3. Real dispatch-status emails (`submitted`, `accepted`, rejection/refund paths)

That overlap creates noisy customer messaging, inconsistent template data, and copy that overstates what happened. It also leaves the Stripe receipt under-specified: the app passes `receipt_email` on first PaymentIntent creation, but it does not attach a clear order reference and does not resync Stripe when an existing pending PaymentIntent is reused.

## Goals

- Keep **Stripe** as the payment receipt sender.
- Keep **Swiss Mail** responsible only for truthful dispatch-status emails.
- Use one clean, consistent Swiss Mail email structure across letter types.
- Remove duplicate or overlapping Swiss Mail success emails.
- Ensure Stripe always receives the customer's email plus a usable order reference.
- Align confirmation-page copy with the real email sequence.

## Non-goals

- Do not add a second Swiss Mail payment-receipt email.
- Do not redesign resume or refund emails beyond shared payload cleanup where needed.
- Do not invent new provider-status meanings or collapse ambiguous dispatch states.
- Do not turn synchronous provider acceptance into extra "good news" email noise if there is no later status change to report.

## Root-cause summary

The current implementation has four material problems:

1. **An obsolete app-level email concept still exists.**  
   `dispatch-confirmation` behaves like a product order-confirmation email, but it is queued from payment capture and also from later dispatch-settlement paths.

2. **Dispatch emails are assembled through different paths with different data quality.**  
   `dispatch-submitted` is queued ad hoc from `submit-dispatch.worker.ts` and currently sends sparse data, including a raw draft ID instead of the formatted order reference.

3. **Payment routes still own customer-email side effects they should not own.**  
   `payment.routes.ts` queues dispatch-facing email on payment capture even though payment truth and dispatch truth must stay separate.

4. **Stripe receipt details are not fully maintained.**  
   The app sets `receipt_email` when first creating a PaymentIntent, but it does not set a clear receipt-facing reference/description and does not update an existing pending PaymentIntent when checkout is resumed.

## Considered approaches

| Approach | Summary | Why not chosen |
| --- | --- | --- |
| **Chosen** | Remove the app-level "dispatch confirmation" email, keep Stripe receipt, keep Swiss Mail dispatch updates only | Best fit for the approved user experience and the locked payment/dispatch separation |
| Retain but rename | Keep the current app confirmation email and retrofit it into `dispatch-submitted` | Still too easy to blur receipt truth and dispatch truth |
| Larger notification-policy refactor | Build one broader notification engine for all payment and dispatch events | Clean long term, but broader than this fix needs |

## Approved design

### 1. Notification policy

The customer-facing sequence is:

- **Stripe receipt** for payment truth
- **Swiss Mail `dispatch-submitted`** once when the letter is first handed into the dispatch pipeline
- **Swiss Mail `dispatch-accepted` or rejection/refund email** only when there is a later status update worth reporting

The app-level `dispatch-confirmation` / `order-confirmed` concept is removed.

This intentionally narrows the success-path Swiss Mail email flow:

- Swiss Mail does **not** send an app receipt at `PaymentState -> captured`
- Swiss Mail does **not** send a generic order-confirmation email
- Swiss Mail does **not** send both `submitted` and `accepted` back-to-back just because the provider returned an immediate acceptance inside the same processing cycle

The design goal is one clean operational email at handoff time, then another only when the status changes later in a meaningful way.

### 2. Stripe receipt contract

Stripe remains the only payment-receipt sender.

#### Required PaymentIntent data

On PaymentIntent creation, the backend must send Stripe:

- `receipt_email` from the checkout email
- a short customer-facing `description` that includes the Swiss Mail order reference
- metadata that includes the same canonical order reference and draft/payment identifiers

The order reference must come from the existing canonical builder (`buildOrderReference(...)`), not from the raw draft ID.

#### Reused checkout intents

If checkout reuses an existing pending PaymentIntent, the backend must update Stripe before returning the client secret so that:

- `receipt_email` matches the latest checkout email
- `description` still carries the correct order reference
- metadata remains aligned with the current draft/payment attempt

If Stripe update fails for a reused pending intent, the backend must not continue with stale receipt data. The safe fallback is to cancel/recreate the checkout intent using the existing reconciliation path rather than hand the client a mismatched PaymentIntent.

#### Stripe-specific design note

The design follows Stripe's documented behavior:

- `receipt_email` is the delivery field for payment receipts
- in live mode, providing `receipt_email` forces Stripe to send the receipt
- `description` is a valid PaymentIntent field and can be updated before confirmation on a reused pending intent

This task does **not** add a second Swiss Mail receipt email as a hedge against Stripe.

### 3. Shared dispatch email payload builder

All Swiss Mail dispatch emails must be fed by one shared backend payload builder instead of ad hoc per-worker data assembly.

#### Canonical base payload

Every dispatch email gets the same base context:

- formatted order reference
- order-status URL
- PDF/statement download URL when the order-access token exists
- sender name
- recipient name
- delivery type
- support email
- app public URL
- legal/footer identity fields
- locale

Dispatch-state-specific fields are layered on top:

- `dispatch-submitted`: no provider-specific certainty beyond handoff/submission
- `dispatch-accepted`: provider reference and tracking/reference details when real
- rejection/refund paths: failure-specific data from the existing settlement flow

#### Letter-type consistency

Standard and registered letters use the same template structure.

- Registered mail may include real provider reference or tracking/reference fields when the provider supplies them.
- Standard mail uses the same layout without empty placeholder rows or fake tracking.

The customer should see one coherent template family, not different email shapes per letter type.

### 4. Trigger ownership and deduplication

Email responsibility moves to the dispatch/status boundary.

#### Remove payment-route dispatch emails

`payment.routes.ts` must stop queueing Swiss Mail dispatch-facing email on:

- Stripe webhook capture
- checkout reconciliation of existing pending payments
- payment-status reads that reconcile Stripe state

Payment routes should create or reconcile payment state and enqueue dispatch work, but not send dispatch-status email themselves.

#### Keep dispatch emails at dispatch transitions

Swiss Mail dispatch emails should be enqueued only from dispatch lifecycle code:

- `dispatch-submitted`: from the dispatch submission worker when the attempt first meaningfully enters the submitted pipeline and is not immediately terminal as rejected
- `dispatch-accepted`: only from a later acceptance transition that follows an earlier non-terminal state
- rejection/refund notifications: from the existing failure/refund path

#### Deterministic job IDs

Every dispatch email needs a deterministic queue identity keyed to the triggering dispatch attempt and template.

Examples:

- `dispatch-submitted:{dispatchAttemptId}`
- `dispatch-accepted:{dispatchAttemptId}`

This aligns the implementation with the repo's idempotency rules and removes retry-driven duplicate sends.

### 5. Template cleanup

The template family is simplified:

- remove the obsolete `dispatch-confirmation` template
- keep `dispatch-submitted`
- keep `dispatch-accepted`
- keep rejection/refund templates already tied to real failure states

`dispatch-submitted` must stop using the raw draft ID as the order reference and must stop rendering with partial footer/layout inputs.

The shared email layout stays in place; the cleanup is about data completeness and template ownership, not a cosmetic rebrand.

### 6. Frontend copy alignment

The confirmation page and locale messages must say **payment receipt**, not vague **confirmation email** wording.

Approved wording direction:

- "A payment receipt has been sent ..."
- "You'll also receive dispatch updates if the status changes."

This keeps the UI honest:

- payment receipt = payment truth
- later dispatch email = dispatch truth

### 7. Error handling

This cleanup must not introduce success-shaped fallbacks.

- If required Stripe receipt sync fails on a reused pending PaymentIntent, checkout is recreated instead of continuing with stale receipt data.
- If required base context for a Swiss Mail dispatch email is missing, the system must fail/log that path rather than send a partial email that looks complete.
- No new code may collapse ambiguous dispatch outcomes into accepted/delivered wording.

### 8. Test strategy

Implementation will start with failing tests for the current regressions:

1. payment routes no longer queue `dispatch-confirmation`
2. Stripe PaymentIntent creation includes `receipt_email` plus order-reference description/metadata
3. reused pending PaymentIntents are updated before reuse
4. `dispatch-submitted` uses complete shared payload data and a deterministic job ID
5. standard and registered letters share the same base template structure, with only real provider fields differing
6. confirmation-page copy and locale strings say **payment receipt**, not generic confirmation email

The sequence under test becomes:

- Stripe receipt data attached to PaymentIntent
- one Swiss Mail `dispatch-submitted` email
- later `dispatch-accepted` only if the status genuinely changes later
- existing rejection/refund path for failures

## Implementation boundary

Expected implementation areas:

- `backend/src/modules/payments/adapters/stripe.adapter.ts`
- `backend/src/modules/payments/payment.routes.ts`
- `backend/src/modules/dispatch/dispatch-confirmation.ts` (removal or replacement)
- `backend/src/modules/dispatch/dispatch-notifications.ts`
- `backend/src/workers/submit-dispatch.worker.ts`
- `backend/src/workers/reconcile-dispatch.worker.ts`
- `backend/src/workers/email-templates.ts`
- `backend/src/workers/email-strings.ts`
- frontend confirmation page and locale message files
- targeted backend/frontend tests covering queueing, templates, Stripe payloads, and copy

## Final decision

Proceed with a cleanup that:

- removes the extra Swiss Mail "order confirmed" email layer
- keeps Stripe as the receipt sender with stronger receipt metadata
- keeps Swiss Mail focused on dispatch-status updates only
- unifies all dispatch email payloads through one shared builder
- suppresses duplicate dispatch emails with deterministic queue identities
- updates the UI to describe the real email sequence accurately
