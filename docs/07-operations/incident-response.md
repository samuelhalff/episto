# Incident Response

> Cross-reference: [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)
> for the provider/API-dependent documentation surfaces that may need review during dispatch incidents.
> See also: [`payment-dispatch-recovery.md`](payment-dispatch-recovery.md) and
> [`disaster-recovery-and-drills.md`](disaster-recovery-and-drills.md) for the detailed operational
> runbooks that sit beneath this incident policy.

## Goal

Handle production incidents quickly, truthfully, and with a clear audit trail. No silent fixes, no guesswork, no invented user messaging.

---

## Incident classes

| Severity | Definition                                    | Examples                                                                                                                                   | Target response   |
| -------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `SEV-1`  | Core production path unavailable or unsafe    | Payments failing broadly, dispatch submissions failing broadly, data exposure suspicion, corrupted PDFs sent                               | Immediate         |
| `SEV-2`  | Major degradation with workaround             | AI drafting unavailable but manual editing still works, provider reconciliation backlog, payment receipt or dispatch-status email failures | Within 30 min     |
| `SEV-3`  | Limited degradation or internal tooling issue | Admin search degraded, delayed analytics, localized rendering bug with workaround                                                          | Same business day |
| `SEV-4`  | Low-risk defect or operational follow-up      | Noisy alert, cosmetic admin issue, stale dashboard metric                                                                                  | Planned backlog   |

---

## Who does what

| Role                | Responsibility                                                                      |
| ------------------- | ----------------------------------------------------------------------------------- |
| Incident lead       | Owns triage, severity, timeline, and final decision-making during the incident      |
| Technical responder | Investigates application, queue, provider, and infrastructure behavior              |
| Support/comms owner | Updates support replies and any user-facing incident notice                         |
| Scribe              | Maintains the incident timeline with timestamps, facts, actions, and open questions |

For MVP, one person may hold multiple roles, but the responsibilities still apply.

---

## Response flow

1. Acknowledge the incident and assign a severity.
2. Freeze speculation. Record only observed facts, affected surfaces, and exact timestamps.
3. Stop harmful automation if needed:
   `dispatch submissions`, `payment capture`, `refund automation`, or `resume email automation`.
4. Contain first, fix second. Prefer feature disablement or queue pause over risky hot edits.
5. Communicate honest status internally and externally. Never claim dispatch, refund, or data-safety outcomes that are not confirmed.
6. Verify recovery with production-safe checks.
7. Write the post-incident review before closing the incident.

---

## First checks

### Payment incident

- Check Stripe webhook delivery status and recent `payment_attempts`
- Confirm whether failures are authorization, capture, or refund related
- Pause capture or refund jobs if state transitions are unsafe
- For case-by-case recovery actions, follow `payment-dispatch-recovery.md`

### Dispatch incident

- Check queue backlog, adapter logs, and `dispatch_attempts`
- Separate `submitted`, `accepted`, `unknown`, and `rejected` counts
- Do not tell users a letter was mailed unless provider acceptance is confirmed
- For ambiguous or retryable cases, follow `payment-dispatch-recovery.md`

### Confirmation page stuck on "Payment verification"

- The confirmation page (`/[locale]/draft/[id]/confirmation`) polls
  `GET /api/v1/drafts/:id/fulfillment`. If it hangs on the "verifying" spinner for **every** order,
  suspect that route: it was once dropped from the backend (with the QES signing routes) while the
  frontend kept polling it, producing a permanent 404 → spinner. Verify the route is registered in
  `payments/payment-status.routes.ts` and returns `{ fulfillment: … }`.
- If it hangs for a **single** order, the payment webhook or dispatch reconciliation for that draft
  likely didn't advance `nextAction` to `view_confirmation`; follow `payment-dispatch-recovery.md`.
- Note: payment and dispatch are unaffected by a broken fulfillment route — it is the status **view**
  only. Customers still receive the payment receipt (at capture) and the dispatch-accepted email
  (with tracking + attached justificatif). The frontend now shows an explicit error + retry after
  repeated poll failures instead of spinning forever.

### Data/privacy incident

- Preserve logs and relevant records immediately
- Stop affected processing path if exposure is plausible
- Do not delete evidence
- Escalate privacy/legal review before sending external conclusions

### AI incident

- Determine whether the issue is availability, quality regression, moderation failure, or leakage into product copy
- If provider output is unsafe or unreliable, disable AI drafting and keep manual editing available

---

## Communications rules

- Use absolute timestamps in UTC in the incident log
- User-facing wording must be factual and minimal
- Never say:
  - "delivered" when the state is only `submitted`
  - "refunded" before Stripe confirms it
  - "all data stayed in Switzerland" unless that exact claim is still true for the affected flow
- If facts are incomplete, say that investigation is ongoing

Suggested holding line:

> We are investigating an issue affecting letter processing. Your draft and payment state are being reviewed carefully. We will update you once we have confirmed facts.

---

## Evidence to retain

- Incident start time and detection source
- Affected environments
- Relevant deployment version / commit
- Queue state and worker state
- Provider references involved
- Logs, traces, screenshots, and support-event links
- Recovery timestamp

Do not place sensitive letter content into the incident log unless strictly necessary.

---

## Recovery checklist

- The triggering symptom is no longer reproducible
- Queues are draining normally
- Payment and dispatch state transitions are consistent
- Error rates and alerts have returned to baseline
- Support has approved the user-facing status wording
- Any paused automation is either safely resumed or explicitly kept disabled

---

## Post-incident review

Required fields:

- Summary
- Customer impact
- Root cause
- Why existing controls did not prevent it
- What was changed immediately
- What follow-up work is required
- Which docs/contracts/alerts need updates

If the incident exposed a documentation gap, update the docs before closing the follow-up action.
