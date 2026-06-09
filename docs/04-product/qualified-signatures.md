# Qualified Electronic Signatures

> **Status:** SwissSign / SwissID readiness scaffold. Public signature architecture and UX may be
> prepared now, but live SwissSign transaction handling remains **not live** until onboarding,
> credentials, and private API details are available.
> See [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md) for the active
> implementation direction.
>
> **Cross-refs:** [`signatures-and-attachments.md`](signatures-and-attachments.md) ·
> [`pricing-structure.md`](pricing-structure.md) ·
> [`provider-submission-model.md`](provider-submission-model.md) ·
> [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md)

---

## Objective

Let users choose between a **typed signature**, a **drawn signature**, and **QES**, while keeping
the standard options simple for everyday letters and making QES available only where a legally
recognized electronic signature is actually needed.

---

## Non-negotiable truths (read this before designing copy)

1. **QES binds the electronic PDF bytes, not the paper.** A printout of a QES-signed PDF does not
   carry the Art. 14(2bis) CO equivalence to a handwritten signature. The binding instrument is
   the electronic original.
2. **Therefore, every QES order also delivers the signed PDF electronically to the recipient.**
   The paper copy we post is a courtesy with a QR code pointing to the electronic original.
3. **QES is required for very few letters.** Swiss Code of Obligations written-form requirement
   (Art. 11+) covers: guaranty declarations, consumer credit agreements, fixed-term residential
   lease terminations, some employment terminations, and similar. Most formal correspondence does
   not need QES.
4. **The identification step is the single biggest conversion risk.** First-time QES users must
   complete video identification (≈5 min). The product must amortize this cost by letting the
   user reuse the same identification across future letters for years.
5. **We must never claim QES gives the paper copy legal weight.** UI copy, marketing pages, and
   terms must be aligned on this.

---

## Public signature model — LOCKED

The signature picker exposes three user-facing choices:

| User-facing choice | Internal mapping | Legal weight (CH)                         | Price delta (placeholder)                 | First-time friction     |
| ------------------ | ---------------- | ----------------------------------------- | ----------------------------------------- | ----------------------- |
| Typed signature    | `visual` + typed | Evidentiary only                          | included                                  | none                    |
| Drawn signature    | `visual` + drawn | Evidentiary only                          | included                                  | none                    |
| QES                | `qualified`      | Equivalent to handwritten (Art. 14(2bis)) | +CHF 9 per letter + CHF 19 one-time ident | +video ident first time |

The backend signing model may stay generic enough for future non-visual tiers, but **AES is not a
public product option** and must not appear in user-facing copy or pricing.

QES price placeholders are stored in config, not code:

- `PRICE_QUALIFIED_SIGNATURE_CENTS`
- `PRICE_QUALIFIED_IDENT_ONE_TIME_CENTS`

Exact pricing is reviewed against real commercial terms before QES launch.

---

## Active provider direction — SwissSign / SwissID readiness

This document now assumes SwissSign / SwissID readiness scaffolding, not a live provider rollout.

What is safe to design around now:

- SwissSign publicly offers integrated electronic-signature solutions with REST API integration,
  mobile app integration, batch signing, and online identification.
- SwissID OIDC supports discovery, authorization, and documented signing-oriented step-up flows.
- SwissSign user guidance indicates QES signing may require a SwissID account, a verified identity,
  the SwissSign Wallet, and a supported smartphone with biometrics.

What must stay abstract until onboarding details arrive:

- Signature-session creation endpoints
- Document-upload or hash-signing request shapes
- Callback/webhook payloads
- Signed-document retrieval endpoints
- Production-grade readiness claims beyond public documentation

---

## Signer readiness and reuse

Identification is still the biggest source of user friction, so the architecture must treat
signer readiness as a first-class concern.

Current design direction:

- Preserve guest-first ordering for the base product.
- Track signature readiness independently from payment and dispatch.
- Store only the minimum signer metadata needed to resume or reconcile a signing-capable order.
- Allow future reuse of a signer's SwissID / SwissSign readiness without forcing that assumption
  into today's non-signature flows.

Failure and retry expectations:

| Failure                                   | Behavior                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| SwissID step-up not completed             | Keep draft and payment authorization recoverable; do not capture.         |
| SwissSign session expires                 | Keep the order resumable where possible; allow a fresh signature session. |
| Signed document not yet retrievable       | Keep order in a pending backend-controlled state; do not dispatch.        |
| Provider callback missing or ambiguous    | Reconcile from backend truth; do not trust redirect params.               |
| User abandons the external signature flow | Preserve order and release or cancel authorization where supported.       |

### Privacy

- Raw ID document images are never stored by Episto. They stay with Skribble / Swisscom as
  data processors.
- We store only the provider transaction reference and minimum metadata required for audit.
- Signer profiles can be purged on request per nFADP / GDPR. Signed evidence packages are
  retained for the statutory window regardless; a deletion request warns the user that the
  signed artifact cannot be retroactively un-associated from the letter it signed.

---

## UX — signature step

### Default state

The picker renders three choices: **typed**, **drawn**, and **QES**. Typed is preselected.
Drawn is available immediately. QES is visible but carries a `Coming soon` badge during Phase 0.
The disabled QES card stays informative, never aspirational — it shows the price delta and a
one-line plain-language description.

### "Do I need a qualified signature?" explainer

A small link sits below the picker: _"Do I need a qualified signature?"_. Opening it reveals a
short, neutral, non-alarming explainer that:

- Explains that most letters do not require QES.
- Lists the cases where written-form is legally required (guaranty, consumer credit, etc.) in
  plain language with one sentence each.
- Links to the full `/signature-requirements` page for the complete reference.
- States clearly: _"A signed electronic PDF holds legal weight electronically. A printout of a
  signed PDF is a copy — the electronic version is the binding instrument."_

The explainer must never upsell — it informs. If the user is clearly in a non-QES use case, the
copy may soft-suggest the standard tier.

### Per-choice disclosure

Each tier card shows:

- Label
- One-line purpose statement
- Price delta (or "included")
- Micro-copy on identification friction ("ID check needed the first time" for QES)
- For QES specifically: a one-line reminder that the recipient also receives the electronic copy

### Checkout acknowledgment

When the user has selected `qualified`, the checkout acknowledgment adds a single extra line:
_"I understand that the legally binding version of this letter is the electronic
PDF, and that the paper we post is a courtesy copy."_ This is additive to the existing
non-legal-service acknowledgment.

### Recipient-side UX (QES orders only)

- The recipient receives an email with the signed PDF attached and a link to
  `episto.ch/verify/<token>` where the signature is validated publicly (cert subject DN,
  timestamp, original hash, jurisdiction).
- The paper copy we post carries a QR code pointing to the same verification URL.

---

## State machine

See `shared/src/state-machines.ts` `SIGNING_TRANSITIONS`.

```
not_required ──→ pending_ident ──→ ident_in_progress ──→ ident_verified ──→ awaiting_signature ──→ signed
     │                 │                   │                    │                      │
     │                 ├───────────────────┼────────────────────┼──────────────────────┼──→ cancelled
     │                 └───────────────────┼────────────────────┴──────────────────────┼──→ expired
     │                                     └──────────────────────────────────────────→ failed
     └──→ awaiting_signature  (reused ident; skips ident states)
```

Terminal states (`signed`, `failed`, `expired`, `cancelled`) are write-locked. A new signing
session means a new record.

---

## Payment capture

Aligned with the locked capture model (Option B: authorize first, capture after acceptance):

- `typed`, `drawn`: unchanged — the existing visual-tier capture behavior applies.
- `qualified`: payment is authorized at checkout, captured only after the signing session reaches
  `signed`. Identification fee (QES first-time) is charged together with the letter fee as a
  single authorization.
- Failure before `signed` → automatic release of the authorization.

---

## Byte-stable PDF contract — LOCKED

QES cryptographically binds the exact PDF bytes that were signed. Therefore:

- After `draft.status` transitions to `ready_to_sign`, the PDF for that draft is frozen. Any
  further edit creates a new draft version; re-rendering a ready-to-sign PDF in place is
  forbidden.
- A SHA-256 hash of the frozen PDF is persisted and cross-checked before handing the bytes to
  the adapter and again before the signed artifact is accepted back.
- The rendering path must be deterministic. Existing "blue signature rendering" work is already
  a signal that determinism requires active maintenance.

Invariant test: `it("freezes PDF bytes once ready_to_sign")` in the rendering module.

---

## Retention

| Artifact                           | Retention                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Signed PDF (original + PAdES-B-LT) | 10 years (`SIGNING_LIMITS.signedEvidenceRetentionDays`).                     |
| Signer profile record              | Until the ident provider says expired, then archive for 10 years (audit).    |
| Ident verification transient data  | Minimum — only the provider reference and verification timestamp are stored. |
| Public verification URL record     | 10 years.                                                                    |

---

## Phasing

| Phase | Scope                                                                                                                                                                                        | Status                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 0     | Public model locked as typed / drawn / QES, shared taxonomy and adapter seam present, legal explainer and reference page in place.                                                           | Existing baseline.     |
| 1     | SwissSign / SwissID readiness foundations: persisted signature state, fulfillment lifecycle, eligibility gate, return/resume UX, OIDC scaffolding, mock provider, callback infrastructure.   | Current task.          |
| 2     | Live SwissSign integration: real session creation, callback verification, signed artifact retrieval, and production readiness checks once credentials and private API details are confirmed. | Blocked on onboarding. |
| 3     | Optional future provider expansion or refined tier strategy after live signature operations are proven.                                                                                      | Later.                 |

---

## Open decisions explicitly deferred

- Exact SwissSign commercial pricing and packaging for SES / QES.
- Exact SwissID claim set and production-grade readiness semantics to persist for reuse.
- Exact signed-artifact retention and verification package requirements after SwissSign onboarding.
- Minor: whether to show a Coming-soon date on disabled tier cards. Default: no date, to avoid
  a missed-quarter trust hit.
