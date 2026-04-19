# Qualified Signature Design

**Status:** Approved for implementation planning  
**Date:** 2026-04-19  
**Scope:** Gap audit and implementation design for advanced / qualified electronic signatures, signer identity reuse, signed-artifact handling, checkout integration, recipient delivery, and public verification

## Summary

The current repository only implements **Phase 0 shell work** for signature assurance:

- shared enums and signing state machine exist
- a stub signing adapter exists
- the logistics UI shows `advanced` / `qualified` as `Coming soon`
- the legal explainer page exists

Everything required to make qualified signatures actually work is still missing from the runtime path.

The main correction is architectural:

**QES is not a thin provider integration.**  
It requires a canonical signing model that the app does not yet have:

- persisted assurance/signing state
- frozen byte-stable PDFs before signing
- a signed-artifact path distinct from the current rendered dispatch statement
- a payment flow that waits for `signed`
- signer identity reuse and re-identification rules
- recipient delivery of the signed electronic original
- public verification and QR linkage

If this is built as a QES-only shortcut on top of the current dispatch flow, the result will be brittle and legally misleading.

## Current Reality

### What exists

- `shared/src/enums.ts` defines `SignatureAssuranceLevel`, `SigningProvider`, `SigningState`, `SignatureJurisdiction`
- `shared/src/state-machines.ts` defines signing transitions
- `shared/src/limits.ts` defines placeholder signing limits
- `backend/src/modules/signing/adapters/signing.adapter.ts` defines the provider seam and stub adapter
- `frontend/src/components/product/SignatureAssuranceTierPicker.tsx` renders the three-tier shell
- `frontend/src/app/[locale]/signature-requirements/page.tsx` provides the explainer page
- `docs/04-product/qualified-signatures.md` and `docs/08-guardrails/open-decisions.md` lock the product direction around Skribble

### What is still fake or missing

#### 1. Assurance level is not persisted

- `frontend/src/components/product/draft-flow/LogisticsStep.tsx` stores `assuranceLevel` in local component state only
- `shared/src/contracts/index.ts`, `shared/src/schemas/index.ts`, and `backend/src/modules/drafting/draft.service.ts` do not carry `assuranceLevel`, `signingState`, `signingProvider`, `jurisdiction`, provider session IDs, or signer-profile references

Effect:

- selection resets on reload
- review/checkout/payment/dispatch cannot know whether the draft is visual, AES, or QES

#### 2. The database has no signing entities

- `backend/src/db/schema/drafting.ts`
- `backend/src/db/schema/files.ts`
- `backend/src/db/schema/payments.ts`

There is no table for:

- signer profiles
- signing sessions / attempts
- signed artifacts / evidence
- verification tokens / public verification records

Effect:

- no canonical audit trail
- no ident reuse
- no safe webhook target state

#### 3. The draft lifecycle has no signing hold

- `shared/src/state-machines.ts`
- `backend/src/modules/drafting/draft.service.ts`
- `backend/src/workers/render-pdf.worker.ts`
- `backend/src/workers/submit-dispatch.worker.ts`

Current runtime path is still:

`reviewed -> rendering -> ready -> checkout/payment -> dispatch`

Effect:

- there is no place to freeze the PDF, wait for signing, accept the signed artifact, then dispatch
- the docs already talk about `ready_to_sign`, but `DraftStatus` does not define it today

#### 4. Snapshot immutability is already violated

- `docs/05-architecture/system-contracts.md` says snapshots are immutable
- `backend/src/modules/rendering/snapshot.service.ts` mutates `snapshotData` and `renderedPdfAssetId` after creation

Effect:

- the current snapshot contract is too loose for byte-stable signing

#### 5. The app has no frozen PDF hash contract

- `backend/src/modules/rendering/render-snapshot-pipeline.ts`
- `backend/src/modules/rendering/snapshot.service.ts`
- `backend/src/modules/rendering/pdf-access.ts`

There is no persisted SHA-256 for:

- the pre-signing frozen PDF
- the returned signed PDF
- the evidence bundle

Effect:

- no reliable proof that the signed bytes match the reviewed bytes

#### 6. Pricing and checkout are dispatch-only

- `backend/src/shared/config/env.ts` has no signing price env vars
- `backend/src/modules/dispatch/dispatch-quote.service.ts` computes dispatch-only totals
- `backend/src/modules/payments/payment-checkout.routes.ts` creates payment attempts from dispatch quote totals only
- `frontend/src/components/product/PriceSummary.tsx`
- `frontend/src/hooks/use-checkout.ts`

Effect:

- no AES/QES surcharge
- no one-time QES identification fee
- no acknowledgment for electronic-original semantics

#### 7. Review and checkout do not expose assurance/signing semantics

- `frontend/src/components/product/review/ReviewPageReady.tsx`
- `frontend/tests/review.test.ts`

Review only knows typed/drawn visual signature mode. It does not surface:

- assurance tier
- signing state
- signing-required blocking
- QES electronic-original warning

#### 8. Provider integration is entirely stubbed

- `backend/src/modules/signing/adapters/signing.adapter.ts`

Missing:

- Skribble adapter
- webhook verification
- provider session creation
- provider status polling / reconciliation
- signed artifact retrieval

#### 9. Signer identity reuse does not exist

Missing:

- signer profile table
- verified email + phone ownership model
- magic-link / OTP reuse flow
- ident expiry handling
- “identify as a different person” branch

Effect:

- the largest conversion-sensitive part of QES is not implemented at all

#### 10. Recipient electronic delivery and public verification do not exist

- `backend/src/modules/dispatch/dispatch-email-context.ts`
- `backend/src/workers/email.worker.ts`
- `backend/src/modules/orders/order.routes.ts`
- `backend/src/modules/rendering/pdf-access.ts`

Current email flow sends internal order/download links and does not attach a signed PDF.  
There is no:

- recipient QES email
- public `/verify/:token` route
- verification record storage
- QR code on the posted paper copy pointing to the verification page

#### 11. The current “PDF download” is the wrong artifact

- `backend/src/modules/rendering/pdf-access.ts`

`sendRenderedDraftPdf()` currently builds a confirmation/dispatch-statement bundle, not a legally relevant signed electronic original.

Effect:

- reusing this path for QES would be incorrect

#### 12. Retention and cleanup rules are incompatible with QES

- `backend/src/modules/retention/index.ts`
- `backend/src/db/schema/files.ts`

Current file retention is short-lived. QES requires long-lived evidence retention and exemption of signed artifacts from normal cleanup.

## Design Decision

Build a **single canonical signing pipeline** and let QES be a specialized policy on top of it.

### Recommended implementation direction

1. Keep the shared three-tier taxonomy and provider lock around Skribble.
2. Add canonical persisted signing entities before any provider wiring.
3. Refactor the lifecycle so the app can freeze a PDF and block dispatch until signing is complete.
4. Introduce separate artifacts:
   - frozen unsigned PDF
   - signed PDF
   - provider evidence / verification metadata
   - public verification record
5. Make payment settlement depend on signing outcome for non-visual tiers.
6. Only then wire frontend flows, signer reuse, and recipient verification.

### Mandatory correction to the current state model

Add an explicit `DraftStatus.ready_to_sign` state.

Recommended draft progression for non-visual tiers:

`reviewed -> rendering -> ready_to_sign -> submitted -> dispatched`

Meaning:

- `ready` remains the visual-tier ready-for-checkout/dispatch state if the team wants backward compatibility
- `ready_to_sign` means:
  - reviewed content is frozen
  - frozen PDF exists
  - frozen PDF SHA-256 is persisted
  - the draft cannot dispatch until signing resolves

If the team chooses not to add `ready_to_sign`, it must define an equally explicit replacement in both code and docs before implementation starts. The current mismatch is not acceptable.

### Critical challenge to the current phase narrative

The locked docs assume “AES first, then QES.” That is only partially right.

The correct interpretation is:

- **build the shared signing infrastructure once**
- **do not special-case QES directly into the current dispatch flow**
- expose AES publicly first only if commercial or risk posture benefits from it

If QES is the only near-term commercial goal, the infrastructure should still stay generic, but the product may choose not to market AES immediately.

## Provider Validation Gate

The current adapter seam assumes provider behavior that has not yet been verified in this repo:

- separate ident and signing sessions
- webhook-driven completion
- retrievable signed PDF bytes
- per-document verification URL
- provider-issued member/profile identifier suitable for reuse

Before implementation commits to the existing adapter contract, run a small Skribble validation spike against real onboarding material or sandbox access and confirm:

1. actual session/resource model
2. actual webhook/event model
3. signed artifact retrieval shape
4. verification URL / verification artifact availability
5. whether ident reuse maps cleanly to a reusable provider-side member/profile concept

If the real API differs, change the adapter contract before schema or service work locks in the wrong shape.

## Proposed Runtime Model

### Canonical entities to add

#### `signer_profiles`

One row per reusable identified signer identity, keyed by verified email + verified phone hash.

Suggested fields:

- `id`
- `email`
- `phone_e164`
- `identity_lookup_hash`
- `display_name`
- `provider`
- `provider_member_id`
- `jurisdiction_reach`
- `verification_method`
- `verified_at`
- `ident_valid_until`
- `last_used_at`
- `revoked_at`
- `metadata`
- `created_at`
- `updated_at`

#### `draft_signing_sessions`

One row per draft signing attempt.

Suggested fields:

- `id`
- `draft_id`
- `snapshot_id`
- `payment_attempt_id`
- `signer_profile_id`
- `assurance_level`
- `jurisdiction`
- `provider`
- `provider_ident_session_id`
- `provider_signing_session_id`
- `signing_state`
- `frozen_pdf_asset_id`
- `frozen_pdf_sha256`
- `signed_pdf_asset_id`
- `signed_pdf_sha256`
- `certificate_subject_dn`
- `certificate_serial`
- `certificate_issuer_dn`
- `signed_at`
- `timestamp_authority_url`
- `verification_url`
- `expires_at`
- `failed_reason`
- `cancelled_at`
- `created_at`
- `updated_at`

#### `public_verification_records`

Suggested fields:

- `id`
- `draft_signing_session_id`
- `public_token_hash`
- `signed_pdf_asset_id`
- `signed_pdf_sha256`
- `jurisdiction`
- `verification_url`
- `certificate_subject_dn`
- `certificate_issuer_dn`
- `certificate_serial`
- `signed_at`
- `expires_at`
- `created_at`

### Canonical draft fields to add

Persist on `draft_letters`:

- `signatureAssuranceLevel`
- `signingState`
- `signingProvider`
- `signatureJurisdiction`
- `activeSigningSessionId`

This is redundant with session rows, but necessary for efficient draft reads and UI state.

## Product Flow

### Visual tier

Keep the existing flow.

### Advanced / qualified tiers

Target flow:

1. user selects assurance level
2. review creates immutable snapshot
3. render worker creates **frozen unsigned PDF**
4. checkout authorizes payment including dispatch + signing charges
5. app creates or reuses signer profile
6. app either:
   - reuses existing identification and jumps to signing, or
   - starts provider identification first
7. provider completes signing
8. backend fetches and stores signed artifact + evidence
9. payment is captured only after `signed`
10. dispatch uses the signed PDF as the posted/electronic source package
11. recipient gets the signed PDF electronically
12. public verification page becomes available for QR / link access

## Payment Timing and Authorization TTL

The current product docs assume a simple “authorize at checkout, capture after signed” rule. That is not sufficient for QES.

Problem:

- Stripe authorization windows are materially shorter than plausible QES identification/retry windows
- first-time QES identification can span hours or days, not only minutes

Recommended policy:

- AES or reused-ident signer: create authorization close to signing time and capture after `signed`
- first-time QES ident: do not rely on a long-lived card authorization surviving the full ident journey

Operationally, one of these must be implemented explicitly:

1. **Preferred:** pre-signing checkout captures consent and payment method details, but the actual payment authorization is created or refreshed only once the signer reaches `awaiting_signature`
2. **Fallback:** create the authorization earlier, but implement explicit re-authorization when the auth window lapses before signing completes

The plan must not assume a single long-lived authorization will survive first-time QES ident.

## Signed-Then-Dispatch-Failed Policy

This policy must be explicit before implementation:

- if signing succeeds, the signed electronic original already exists and remains valid
- if physical dispatch then fails, the system must still preserve and expose the signed artifact
- the recipient-side electronic delivery policy must stay defined even when paper dispatch fails

Recommended commercial policy:

- keep signing fee
- keep ident fee once the provider-rendered identification service was actually consumed
- refund dispatch-only charges if physical dispatch fails before provider acceptance

This implies the payment model must preserve line-item semantics strongly enough to support partial refunds and support/admin explanations.

## Risks

### Risk 1: Trying to reuse the current confirmation PDF path

This would conflate:

- internal commercial confirmation bundle
- signed legal artifact

They must stay separate.

### Risk 2: Treating snapshot mutation as harmless

For QES, the boundary between reviewed content, frozen bytes, and signed bytes must be explicit and auditable.

### Risk 3: Implementing provider calls before the data model

That creates untraceable session state and fragile webhook handling.

### Risk 4: Exposing QES without signer reuse

That would maximize first-time friction and waste the strongest product advantage of the chosen provider path.

### Risk 5: Claiming paper legal equivalence in UX by accident

Every checkout, review, email, and verification surface must keep the electronic-original caveat explicit.

### Risk 6: Treating payment timing as solved by the existing Stripe flow

QES first-time identification makes payment authorization timing materially harder than the current dispatch-only model.

### Risk 7: Leaving “signed but dispatch failed” undefined

That scenario is inevitable in production and needs automated artifact, refund, and recipient-delivery rules.

## Non-goals

- changing the visual typed/drawn signature design beyond assurance integration
- collapsing signed PDF delivery into the current order confirmation download
- storing raw identity documents on our infrastructure
- skipping public verification because the provider already has a hosted viewer

## Success Criteria

This design is successful when:

1. a draft persists assurance level and signing state end to end
2. a reviewed draft produces a frozen PDF with a persisted hash before signing
3. non-visual tiers block capture and dispatch until signing completes
4. signer reuse works from verified email + phone identity
5. the signed PDF, evidence metadata, and public verification record are stored and retained separately from ordinary draft files
6. recipients of QES orders receive the signed electronic original and can verify it publicly
7. the paper-copy UX never overclaims the legal scope of QES
