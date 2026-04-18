# Qualified Electronic Signatures

> **Status:** Phase 0 — taxonomy, UI shell, and adapter seam are implemented. Phase 1 (AES) and
> Phase 2 (QES) require the locked signing provider's sandbox onboarding and live credentials.
> See [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md) for the provider
> three-option review.
>
> **Cross-refs:** [`signatures-and-attachments.md`](signatures-and-attachments.md) ·
> [`pricing-structure.md`](pricing-structure.md) ·
> [`provider-submission-model.md`](provider-submission-model.md) ·
> [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md)

---

## Objective

Let users optionally sign their letter with an advanced or qualified electronic signature under
Swiss ZertES (and eIDAS for cross-border recipients), without scaring the 95% of users who don't
need it and without misrepresenting the legal value of a signed document that is also printed and
posted on paper.

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

## Three-tier assurance model — LOCKED

The signature picker exposes three tiers. The internal enum values are stable; user-facing labels
may vary per locale.

| Enum value (`SignatureAssuranceLevel`) | User-facing label   | Legal weight (CH)                         | Price delta (placeholder)                 | First-time friction     |
| -------------------------------------- | ------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------- |
| `visual`                               | Standard signature  | Evidentiary only                          | included                                  | none                    |
| `advanced`                             | Advanced signature  | Advanced electronic signature (AES)       | +CHF 3 (Phase 1 target)                   | +email/SMS OTP (~30 s)  |
| `qualified`                            | Qualified signature | Equivalent to handwritten (Art. 14(2bis)) | +CHF 9 per letter + CHF 19 one-time ident | +video ident first time |

Price placeholders are stored in config, not code:

- `PRICE_ADVANCED_SIGNATURE_CENTS`
- `PRICE_QUALIFIED_SIGNATURE_CENTS`
- `PRICE_QUALIFIED_IDENT_ONE_TIME_CENTS`

Exact pricing is reviewed against real commercial terms before Phase 1 launch.

---

## Locked signing provider — Skribble (Phase 1 and Phase 2)

See [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md) → _QES provider
path_ for the three-option review. Summary:

- **Skribble** handles both AES and QES against a single REST API and ident flow. Supports ZertES
  and eIDAS per document. Ident reuse is productized. Matches our DE/FR/IT/EN locale set.
- Swisscom All-in Signing Service direct (cheaper at scale) is deferred to Phase 3 after volume
  justifies the additional integration work.
- SwissSign is rejected for MVP — opaque developer experience, SwissID-only ident advantage.

Adapter module: `backend/src/modules/signing/adapters/skribble.adapter.ts` (created in Phase 1).

---

## Bulletproof ident reuse — LOCKED design

Identification is the biggest source of user frustration. Treat it as a first-class entity.

### Identity ownership

- Identity is tied to the pair `(verified email, verified phone E.164)`, not to a Swiss Mail
  account.
- Every QES-capable signer record stores: Skribble `member` identifier, jurisdiction reach
  (`zertes_ch`, `eidas_eu`), verification method, verification timestamp, expiry timestamp, last
  successful use.
- The record lives in the `signer_profile` table with a lookup index on the hash of the email +
  phone pair.

### Reuse guarantees

- Ident is reusable for the duration Skribble considers the verification valid. Track the expiry
  explicitly (`ident_valid_until`) and refuse to start a new signing session within 48 h of
  expiry; instead prompt a re-identification.
- When the user returns with the same email, we look up the signer profile, send a
  passwordless magic link, and on click the UI shows "Welcome back, you're already identified —
  ready to sign in 10 seconds."
- The user can explicitly cancel the reuse ("I'd like to identify as a different person") and
  start a fresh ident session; the previous profile is not deleted — it stays available for the
  recorded person.
- Reuse works across devices: the magic-link + OTP re-auth is per session and does not require
  the original browser.

### Failure modes and handling

| Failure                                       | Behavior                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Skribble says ident expired                   | Re-identification required; UI shows empathetic copy; previous letters remain valid.         |
| Phone number changed                          | Refuse silent reuse; require re-ident with new number; keep historical records intact.       |
| Email changed                                 | Treated as new signer. Old record remains for historical letter verification.                |
| Skribble API unavailable during sign session  | Show retry UI; preserve draft; no partial captures; preserve payment auth until recovery.    |
| Provider cert revoked                         | Block new signing sessions on that profile; preserve past signed artifacts and their proofs. |
| Signing session expires mid-flow              | Draft preserved; payment auth released per `SigningState → expired` transition.              |
| User starts QES but abandons the signing step | Payment authorized but not captured; auto-release after TTL.                                 |

### Privacy

- Raw ID document images are never stored by Swiss Mail. They stay with Skribble / Swisscom as
  data processors.
- We store only the provider transaction reference and minimum metadata required for audit.
- Signer profiles can be purged on request per nFADP / GDPR. Signed evidence packages are
  retained for the statutory window regardless; a deletion request warns the user that the
  signed artifact cannot be retroactively un-associated from the letter it signed.

---

## UX — signature step

### Default state

The three-tier picker is rendered. `visual` is preselected. The `advanced` and `qualified` cards
are visible but carry a `Coming soon` badge during Phase 0. Disabled cards stay informative,
never aspirational — they show the price delta and a one-line plain-language description.

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

### Per-tier disclosure

Each tier card shows:

- Label
- One-line purpose statement
- Price delta (or "included")
- Micro-copy on identification friction ("ID check needed the first time" for QES)
- For QES specifically: a one-line reminder that the recipient also receives the electronic copy

### Checkout acknowledgment

When the user has selected `advanced` or `qualified`, the checkout acknowledgment adds a single
extra line: _"I understand that the legally binding version of this letter is the electronic
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

- `visual`: unchanged — the existing capture behavior applies.
- `advanced`, `qualified`: payment is authorized at checkout, captured only after the signing
  session reaches `signed`. Identification fee (QES first-time) is charged together with the
  letter fee as a single authorization.
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

| Phase | Scope                                                                                                                                                                                                                                 | Status                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 0     | Shared taxonomy (`SignatureAssuranceLevel`, `SigningState`, `SigningProvider`), state machine, adapter interface + stub, three-tier UI shell (`advanced`/`qualified` shown as _Coming soon_), explainer, legal reference page, tests. | Implemented in this PR. |
| 1     | AES live via Skribble: email/SMS OTP ident, PAdES-B-LT signing, webhook, signed artifact storage, recipient electronic delivery, checkout copy update.                                                                                | Pending credentials.    |
| 2     | QES live via Skribble: video ident, jurisdiction selection (ZertES/eIDAS), signer profile reuse, 10-year retention, public verification page.                                                                                         | Pending credentials.    |
| 3     | Swisscom All-in Signing Service direct adapter for margin improvement at volume.                                                                                                                                                      | Post-launch.            |

---

## Open decisions explicitly deferred

- Exact pricing against real commercial terms with Skribble (placeholders locked for design; real
  numbers gated on contract).
- Exact ident-validity window per Skribble policy (design assumes 5 years; confirm at onboarding).
- Minor: whether to show a Coming-soon date on disabled tier cards. Default: no date, to avoid
  a missed-quarter trust hit.
