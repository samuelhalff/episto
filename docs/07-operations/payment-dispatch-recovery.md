# Payment and Dispatch Recovery

**Status:** Authoritative operational runbook  
**Scope:** Safe recovery procedures for duplicate-payment concerns, ambiguous dispatch outcomes,
refund handling, and reconciliation actions.  
**See also:** [`incident-response.md`](incident-response.md) ·
[`admin-and-support.md`](admin-and-support.md) ·
[`../04-product/provider-submission-model.md`](../04-product/provider-submission-model.md) ·
[`../05-architecture/system-contracts.md`](../05-architecture/system-contracts.md)

---

## Core rule

Never improvise payment or dispatch recovery during a live case.

All recovery work must preserve:

- canonical state-machine truth
- idempotency
- auditability
- honest user messaging

Do not mutate payment or dispatch state directly "just to fix the screen."

---

## 1. Evidence first

Before taking any recovery action, gather:

- `draftId`
- `paymentAttemptId`
- `dispatchAttemptId`
- current `PaymentState`
- current `DispatchState`
- relevant provider reference(s)
- recent `support_event` history

If the facts are incomplete, the case stays under review until the facts improve.

---

## 2. Duplicate-payment concern

### What to check

1. how many `payment_attempts` exist for the draft/session?
2. did Stripe confirm more than one capture, or only multiple authorizations?
3. did the user restart checkout after an interrupted flow?
4. was a refund already requested or completed?

### Safe actions

- if only one capture exists: explain that no duplicate charge is confirmed
- if multiple authorizations exist but only one capture: explain authorization vs final capture
- if multiple captures are confirmed: begin refund workflow and log explicit support justification

### Prohibited actions

- do not promise a refund before Stripe confirms it
- do not manually label a payment `refunded` because support expects it

---

## 3. Payment captured, dispatch ambiguous

This is one of the most trust-sensitive cases.

### What to check

1. was the final PDF rendered?
2. was a dispatch attempt created?
3. did the adapter record `submitted`, `accepted`, `rejected`, or `unknown`?
4. is a reconciliation job already queued or recently run?

### Safe actions

- if dispatch is `unknown`, keep the case under review and trigger safe reconciliation when allowed
- if the case remains materially unclear after the defined review path, escalate same business day
- use the "under review" user wording; do not invent acceptance or rejection

### Refund rule

Do not refund immediately only because the case is uncomfortable. Refund when:

- rejection is deterministic, or
- a documented operational decision concludes the ambiguous case cannot safely be honored

---

## 4. Deterministic dispatch rejection

### What to check

- rejection reason category
- whether the reason is user-actionable
- whether payment capture already happened

### Safe actions

- if capture is confirmed and rejection is deterministic: trigger refund through the approved path
- send plain-language explanation only if the reason is fit for user communication
- log the reason category and the support/admin justification

### Prohibited actions

- do not surface raw provider payload strings to the user
- do not claim the provider "made a mistake" unless a later reconciliation proves it

---

## 5. Refund appears stuck

### What to check

- was a refund request sent to Stripe?
- is the state waiting on Stripe confirmation or internal follow-up?
- was the case already touched by support?

### Safe actions

- keep the case in a pending-refund operational state
- explain that the refund is in progress until Stripe confirms it
- escalate if the pending state outlasts the documented operational review window

### Prohibited actions

- do not show refunded UI before Stripe confirmation
- do not create ad hoc ledger corrections outside the documented payment path

---

## 6. Safe admin actions

The following are the only recovery actions this runbook assumes:

- trigger safe reconciliation for a retryable ambiguous dispatch case
- trigger refund in an approved and auditable case
- mark escalation or review status

Anything beyond that requires a documented expansion of the admin/support model first.

---

## 7. Audit requirements

Every manual recovery action must emit a `support_event` or equivalent audit record with:

- actor identifier
- action type
- timestamp
- linked draft/payment/dispatch reference
- human note explaining why the action was taken

If the reason cannot be written clearly, the action is probably not ready.

---

## 8. User messaging rules

- never say "delivered" when the state is only `submitted` or `accepted`
- never say "refunded" before confirmation
- if the case is ambiguous, say it is under review
- if the facts are incomplete, say investigation is ongoing

Operational urgency does not justify false certainty.

---

## 9. Launch gate

Before launch:

- support can investigate duplicate-payment concerns from canonical records
- ambiguous dispatch cases have a same-business-day review path
- refund actions require justification and emit audit records
- at least one dry run of this workflow has been performed before public launch

If these conditions are not met, payment/dispatch operations are not launch-ready.
