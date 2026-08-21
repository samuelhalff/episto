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

### Why the same letter is not submitted twice

The user story: _a user paid once and expects Swiss Post to receive one letter._

Three things keep that true, in order:

1. **Deterministic job id.** `enqueueDispatchSubmission` uses `dispatch-{paymentAttemptId}`,
   so the queue cannot hold two submit jobs for one payment.
2. **Terminal-state check.** The worker skips a payment whose dispatch attempt has
   already left `queued`.
3. **Submission lease.** `dispatch_attempts.claimed_at`, taken by a conditional
   `UPDATE` before the package is assembled. This is the one that covers a
   _stalled_ job being re-delivered while the first worker is still waiting on the
   provider. A row lock cannot cover that window — the provider call happens
   outside any transaction — so the lease does, and it expires after
   `DISPATCH_CLAIM_TTL_MINUTES` (15) so a worker that dies does not strand the
   letter. A worker that gives up before calling the provider hands the lease
   straight back; one that has already called it does not, because it cannot know
   whether the call arrived.

4. **Point of no return.** `dispatch_attempts.submission_started_at`, written
   immediately _before_ the provider call. Past it, no worker may claim the
   attempt again — not even after the lease expires. We cannot tell a letter
   Swiss Post never received from one it already has, and a duplicate posting is
   worse than a letter that stops for review.

### Why a paid letter does not sit queued forever

The mirror-image story: _the worker died and nobody is watching the letter._

The `dispatch-liveness` sweep runs every ten minutes and picks up queued attempts
older than the lease TTL that nobody holds:

- `submission_started_at IS NULL` — nothing was sent, so the submission is put
  back on the queue (the old BullMQ job record is removed first, or the
  deterministic job id would make the re-add a silent no-op).
- `submission_started_at` set — ambiguous. The attempt is moved to `unknown` and
  handed to reconciliation, never resubmitted. From there it follows §3.

**Support consequence:** a `queued` attempt with a recent `claimed_at` is being
submitted right now — wait, do not retry it. A `queued` attempt whose `claimed_at`
is older than 15 minutes (or null) will be picked up by the next liveness sweep;
if it is still there after ~10 minutes, that is a real incident.

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

### How the worker decides between the two

When the provider call itself throws, the submit worker has already passed the
point of no return (`submission_started_at` is set), so a retry cannot help — a
retried job would find a terminal state and no-op. It therefore never rethrows.
It splits on one signal — and that signal is **not** the error family. Families
were the first design and they were wrong: our own pre-flight validation refuses
a letter with `validation_error`, which says nothing about whether anything was
transmitted. The decision now rests on an explicit marker the adapter puts on the
error (`markLetterNotSent`, `backend/src/modules/dispatch/dispatch-outcome.ts`):

- the error carries the "nothing was sent" mark — the adapter is asserting, from
  the site that threw, that no request reached the provider, or that the provider
  answered 400/422 before accepting anything. The attempt is settled as a
  deterministic rejection and the payment is refunded (see §4).
- anything else, **including any error nobody thought to mark** — a timeout, a
  5xx, a transport error, an unrecognised shape. The letter may or may not be at
  Swiss Post. The attempt goes to `unknown`, the draft to `submitted`, a
  reconciliation job is queued, and **no refund is issued**. Treat it as §3, not
  §4.

The default is deliberate: forgetting to mark an error costs one manual review,
while marking one wrongly costs a letter that was posted _and_ refunded. The
three marking sites in `epost.adapter.ts` are pinned by
`backend/tests/epost-nothing-sent-contract.test.ts` — if you add a throw before
or around the provider call, add a case there.

If the refund settlement itself fails after a deterministic rejection, the worker
logs and returns rather than retrying; the 10-minute `dispatch-liveness` sweep
picks the attempt up. An attempt that is `queued` with a recent `claimed_at` is
being submitted right now — wait, do not retry it.

### Known limits of this rule

Accepted and monitored, not yet closed:

- **A failed refund settlement degrades to a human.** There is no automatic retry
  of the refund itself; the liveness sweep only re-surfaces the attempt.
- **The 15-minute claim lease can expire while the provider call is still
  running.** The sweep then flags the attempt `unknown` even though the original
  worker is about to return a real answer. Safe (nothing is resent), but it
  produces avoidable manual reviews. A lease heartbeat is the fix.
- **"400/422 means nothing was posted" is our reading of the ePost API, not a
  contractual guarantee**, and ePost exposes no client-supplied idempotency key,
  so no resend can be made provably safe. If a 4xx is ever observed alongside a
  letter that was in fact posted, delete the `dispatch_rejection` marking site in
  `epost.adapter.ts` and let those errors fall through to `unknown`.

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

### Free (zero-amount) orders

Free orders have no Stripe PaymentIntent or charge. Dispatch settlement performs
no Stripe action for them: accepted dispatches finalize locally, and rejected
free orders move `captured` to `refunded` as a zero-amount void. This does not
create a `payment_refunds` ledger row and is not a Stripe refund; admin refund
views may show a CHF 0 refunded row, which is expected and must not be read as
money moved.

The liveness sweep also re-drives stale `submitted` dispatch attempts that have
a provider reference through reconciliation, so a provider-accepted order that
missed local finalization is picked up automatically.

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
