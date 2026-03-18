# Abuse and Fraud Operations

**Status:** Authoritative operational plan  
**Scope:** Abuse detection, suspicious-activity review, escalation rules, and privacy-safe handling of
fraud-like patterns.  
**See also:** [`admin-and-support.md`](admin-and-support.md) ·
[`security-and-privacy.md`](security-and-privacy.md) ·
[`incident-response.md`](incident-response.md) ·
[`../04-product/content-moderation.md`](../04-product/content-moderation.md)

---

## Core rule

Swiss Mail must detect harmful operational patterns **without** turning moderation or support into a
permanent content archive.

Detection is metadata-first:

- session and draft activity
- payment attempts
- dispatch outcomes
- refund patterns
- support events

Do not default to retaining or mining full letter content for abuse operations.

---

## 1. What this document covers

This document covers:

- suspicious payment and refund patterns
- suspicious dispatch and provider-submission patterns
- suspicious repeated-session behavior
- escalation and review ownership

This document does **not** change the blocked-content rules in
[`../04-product/content-moderation.md`](../04-product/content-moderation.md). It operationalizes what
happens after a pattern is flagged.

---

## 2. Risk categories

| Category | Example signal | Primary risk |
|---|---|---|
| Payment abuse | repeated failed payments, repeated chargeback-like complaints, many refunds | margin loss, support load |
| Submission abuse | repeated provider rejections, high-volume repeated dispatch attempts | provider trust damage |
| Identity/representation abuse | repeated suspicious third-party representation patterns | trust, legal exposure |
| Token abuse | repeated invalid resume-token probing | enumeration or credential abuse |
| Mixed suspicious behavior | payment failures + dispatch ambiguity + repeated retries | account- or session-level bad-faith use |

---

## 3. Detection inputs

The following signals may feed abuse review:

- repeated `payment_failed` or `refund_requested` events tied to one email, session, or IP window
- repeated dispatch rejection patterns tied to one email, session, or device/IP cluster
- repeated resume-token misses from the same IP range
- multiple near-identical drafts sent or attempted rapidly
- repeated support contacts claiming duplicate payment or non-received service while internal records
  do not match the claim

Attachment contents and full letter bodies are **not** a default abuse signal source in MVP.

---

## 4. Starter heuristics

Exact abuse thresholds remain operationally tunable and must stay configurable.

Swiss Mail may launch with starter heuristics such as:

- repeated failed payment attempts in a short window
- multiple deterministic refunds tied to the same email or session over a short period
- multiple provider rejections tied to the same actor or recipient pattern
- repeated invalid token lookups from the same IP range

These heuristics are **review triggers**, not public promises or legal determinations.

If a heuristic is too noisy in practice, tune it operationally rather than encoding permanent hard
blocks without review.

---

## 5. Escalation levels

### Level 0 — Observe only

- signal is recorded
- no user-facing friction added
- visible in admin counters or suspicious-activity view

### Level 1 — Flag for review

- add suspicious-activity flag in admin
- create `support_event` or equivalent operational record
- case appears in next business-day review queue

### Level 2 — Manual review before irreversible action

Used when:

- refund is requested in a suspicious pattern
- dispatch retry or reconciliation could create duplicate operational side effects
- multiple abuse signals cluster on one draft/session/email

### Level 3 — Incident / provider-risk handling

Used when:

- abuse patterns appear systematic
- provider relationship or payment exposure is materially at risk
- abuse volume looks automated or coordinated

At this level, follow [`incident-response.md`](incident-response.md) and consider temporarily pausing:

- dispatch retries
- refund automation
- other high-risk automated follow-up paths

---

## 6. Daily review workflow

Before launch, there must be a named business-day owner for the suspicious-activity queue.

Each review should answer:

1. is this likely noise or a real pattern?
2. does any user-facing action need to change now?
3. does support need a prepared response?
4. does payment, dispatch, or refund automation need to be slowed or paused?

Do not leave suspicious-activity flags orphaned in admin without ownership.

---

## 7. Admin visibility

Admin must be able to see:

- flag category
- first-seen and last-seen timestamps
- related `sessionId`, `draftId`, `paymentAttemptId`, or `dispatchAttemptId`
- current escalation level
- review note history

Admin must **not** become a hidden content-review system by default.

If a reviewer opens letter content because it is operationally necessary and still within retention,
that access must be logged explicitly as a privileged support/admin event.

---

## 8. Support relationship

Support does not decide fraud guilt. Support handles the customer-safe side of the workflow.

That means:

- use neutral language
- do not accuse the user of criminal conduct
- do not imply human legal review unless one actually occurred
- do not promise refund, dispatch acceptance, or provider blocking outcomes before confirmation

Where needed, support should use canned responses aligned to:

- duplicate-payment concern
- refund under review
- dispatch under review
- temporary inability to proceed while the case is being checked

---

## 9. Prohibited shortcuts

- Do not auto-block based on one noisy signal alone unless a separate security decision explicitly
  approves it
- Do not log full letter body content into abuse dashboards
- Do not expose raw provider or Stripe jargon to the user
- Do not let support invent certainty from incomplete metadata

---

## 10. Launch gate

Before launch:

- suspicious-activity signals exist in admin
- review ownership exists on business days
- support has canned responses for abuse-adjacent cases
- escalation from abuse review to incident handling is documented
- no abuse workflow depends on hidden permanent content retention

If these conditions are missing, support readiness is incomplete.
