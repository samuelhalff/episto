# Qualified Electronic Signatures — REMOVED FROM THE PRODUCT

> **Status: not part of episto.** Qualified electronic signatures (QES) and the SwissSign /
> SwissID provider scaffolding were **removed on 2026-06-10** per
> [`../superpowers/plans/2026-06-10-remove-qes-swisssign-signing.md`](../superpowers/plans/2026-06-10-remove-qes-swisssign-signing.md).
> A user cannot choose QES, and no part of the running system can produce a qualified signature.
> The live signature model is **typed or drawn only** — see
> [`signatures-and-attachments.md`](signatures-and-attachments.md).
>
> This file is retained as **background**: the Swiss-law analysis below stayed correct and would be
> the starting point if QES were ever revisited. Nothing in it describes shipped behaviour.
>
> **Cross-refs:** [`signatures-and-attachments.md`](signatures-and-attachments.md) ·
> [`pricing-structure.md`](pricing-structure.md) ·
> [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md)

---

## What the removal actually removed

Verified in the current tree:

- `shared/src/enums.ts:78` defines `SignatureFlowMode` as `{ none, visual }`. There is no
  `qualified`, `advanced`, or `swisssign_ses` value, and no `signatureAssuranceLevel` enum.
- There are no `signature_sessions`, `signature_events`, `signature_provider`,
  `signature_eligibility_status`, or `signature_session_status` objects in
  `backend/src/db/schema/`.
- The fulfilment transition table in `shared/src/state-machines.ts:189` has one path only:
  `draft_created → draft_completed → preview_ready → signature_not_required → …`. There are no
  ident, session, or signing states.
- `backend/src/modules/signing/fulfillment.service.ts:59` still accepts the historical flow-mode
  argument but ignores it (`_signatureFlowMode`); every draft follows the visual/none path.
- No SwissSign, SwissID, or Skribble reference remains anywhere in `backend/src`, `shared/src`, or
  `frontend/src`.

There is therefore nothing to "turn on". Reintroducing QES would be a new implementation, not the
lifting of a gate.

---

## Background — Swiss legal analysis (retained, not implemented)

These points were established during the 2026-04/05 design work and remain legally accurate. They
are recorded so that any future evaluation does not have to re-derive them.

1. **QES binds the electronic PDF bytes, not the paper.** A printout of a QES-signed PDF does not
   carry the Art. 14(2bis) CO equivalence to a handwritten signature. The binding instrument is the
   electronic original.
2. **A QES offering would therefore have to deliver the signed PDF electronically** to the
   recipient; a posted paper copy could only ever be a courtesy copy.
3. **Very few letters require QES.** The written-form requirement of the Code of Obligations
   (Art. 11 et seq.) covers guaranty declarations, consumer credit agreements, fixed-term
   residential lease terminations, certain employment terminations, and comparable cases. Ordinary
   formal correspondence does not need it.
4. **Identification is the dominant conversion risk.** A first-time QES signer must complete video
   identification (roughly five minutes), which only amortises if the identification can be reused
   across later letters.
5. **No copy may ever claim that QES gives a paper copy legal weight.** This constraint applies to
   the current product too: episto's typed and drawn signatures are evidentiary only, and the UI,
   marketing pages, and terms must not suggest otherwise.
6. **AES was never a public option.** The intermediate advanced-signature tier was rejected on
   product grounds before removal and should not reappear in user-facing copy or pricing.

### Byte stability — still relevant to rendering

Any cryptographic signature binds exact bytes, so a future QES path would require the rendered PDF
to be frozen once a draft is final and re-rendering in place to be forbidden, with a persisted
SHA-256 hash checked before and after signing. The current product has no such requirement, but the
determinism of the rendering path is worth preserving regardless.

### Privacy position (as designed)

Raw identity-document images were never to be stored by episto; only a provider transaction
reference and the minimum audit metadata. Signed evidence packages would carry a statutory
retention period independent of an erasure request. None of this is implemented, and no signer or
identification data exists in the database today.

---

## Historical record

- 2026-04-19 — [`../superpowers/plans/2026-04-19-qualified-signature-implementation.md`](../superpowers/plans/2026-04-19-qualified-signature-implementation.md)
- 2026-04-20 — [`../05-architecture/2026-04-20-swisssign-readiness-audit.md`](../05-architecture/2026-04-20-swisssign-readiness-audit.md)
  and [`../superpowers/plans/2026-04-20-swisssign-readiness.md`](../superpowers/plans/2026-04-20-swisssign-readiness.md)
- 2026-05-01 — [`../superpowers/plans/2026-05-01-preview-qes-audience.md`](../superpowers/plans/2026-05-01-preview-qes-audience.md)
- 2026-06-10 — removal: [`../superpowers/plans/2026-06-10-remove-qes-swisssign-signing.md`](../superpowers/plans/2026-06-10-remove-qes-swisssign-signing.md)

Those plan documents describe the state of the world when they were written and are not corrected
here.
