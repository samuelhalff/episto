# Qualified Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current QES shell with a real signing pipeline that supports persisted assurance state, signer identity reuse, frozen PDFs, provider-driven signing, capture-after-signing, recipient electronic delivery, and public verification.

**Architecture:** Build the signing model from the inside out. First persist the missing state and artifacts, then refactor the draft/render/payment flow around a frozen-PDF signing hold, then wire the Skribble adapter, and only then expose the full frontend/review/checkout/recipient experience. Do not bolt QES directly onto the current dispatch-only runtime.

**Tech Stack:** TypeScript, Next.js, Fastify, Drizzle, BullMQ, Stripe, S3-compatible object storage, Resend, shared workspace package

---

## Scope Decision

Implement the **generic signing infrastructure once**. Keep the data model and services generic across `advanced` and `qualified`.

Product exposure options:

- safest: launch AES first, then QES
- faster if business insists on QES: build the same generic infrastructure, but expose only QES externally at first

Do **not** build a QES-only special path in storage, state, or payment.

## Missing Workstreams

1. Skribble API validation spike
2. Shared contracts and database schema
3. Draft/review/render/signing lifecycle refactor
4. Pricing and payment changes
5. Skribble integration
6. Signer identity reuse
7. Frontend selection/review/checkout/signing UX
8. Recipient delivery, verification page, and QR linkage
9. Retention, admin, observability, and tests

## Recommended Delivery Sequence

### Phase 0: Validate the real Skribble API shape

**Why first:** the current adapter seam is partly inferred. Locking schema and service code before validating the provider surface is risky.

**Files likely touched**

- `docs/04-product/qualified-signatures.md`
- `docs/superpowers/specs/2026-04-19-qualified-signature-design.md`
- `backend/src/modules/signing/adapters/signing.adapter.ts`

- [ ] Validate the real resource/session model from Skribble onboarding material or sandbox access.
- [ ] Confirm whether ident and signing are separate flows or one combined provider flow.
- [ ] Confirm signed artifact retrieval shape, verification URL availability, and webhook semantics.
- [ ] Adjust the adapter contract if the current seam is wrong.
- [ ] Commit.

**Critical review gate**

- do not build schema or services on top of guessed provider behavior

### Phase 1: Persist the missing signing model

**Why first:** nothing else is reliable until the system can store canonical signing state.

**Files likely touched**

- `shared/src/enums.ts`
- `shared/src/schemas/index.ts`
- `shared/src/contracts/index.ts`
- `backend/src/db/schema/drafting.ts`
- `backend/src/db/schema/files.ts`
- `backend/src/db/schema/payments.ts`
- `backend/src/db/schema/relations.ts`
- new `backend/src/db/schema/signing.ts`
- new Drizzle migrations under `backend/drizzle/`
- `backend/src/modules/drafting/draft.service.ts`
- `shared/src/state-machines.ts`

- [ ] Add persisted draft-level fields for assurance/signing state.
- [ ] Add `DraftStatus.ready_to_sign` and update draft transitions deliberately.
- [ ] Add `signer_profiles`.
- [ ] Add `draft_signing_sessions`.
- [ ] Add `public_verification_records`.
- [ ] Add schema validation and API response coverage.
- [ ] Add shared tests that fail without the new fields.
- [ ] Commit.

**Critical review gate**

- do not overload `metadata`
- do not store provider session IDs only in webhook logs
- do not couple signer identity to transient guest session IDs

### Phase 2: Refactor the lifecycle around a frozen PDF

**Why second:** provider integration is useless until the app has a stable artifact to sign.

**Files likely touched**

- `shared/src/state-machines.ts`
- `backend/src/modules/drafting/draft.routes.ts`
- `backend/src/modules/drafting/draft.service.ts`
- `backend/src/modules/rendering/snapshot.service.ts`
- `backend/src/modules/rendering/render-snapshot-pipeline.ts`
- `backend/src/workers/render-pdf.worker.ts`
- `backend/src/modules/dispatch/dispatch-package.service.ts`
- `docs/05-architecture/system-contracts.md` if kept aligned during implementation

- [ ] Introduce explicit signing-ready/frozen-PDF behavior after review render.
- [ ] Make `ready_to_sign` the authoritative non-visual post-render hold state.
- [ ] Persist frozen PDF asset ID and SHA-256.
- [ ] Stop mutating snapshot payload as a side-channel for core signing state.
- [ ] Make dispatch package builder select the correct artifact for signed vs visual flows.
- [ ] Add invariant tests for frozen-PDF hash stability.
- [ ] Commit.

**Critical review gate**

- if snapshot immutability stays ambiguous, stop and fix the contract before provider work

### Phase 3: Extend pricing and payment for signing-aware orders

**Why third:** signing orders need correct amounts and capture timing before any external flow is enabled.

**Parallelization note:** after Phase 1 lands, most of this phase can proceed in parallel with Phase 2 except for any code that depends directly on `ready_to_sign` lifecycle behavior.

**Files likely touched**

- `.env.example`
- `backend/src/shared/config/env.ts`
- `backend/src/modules/dispatch/dispatch-quote.service.ts`
- new signing-aware pricing helper under `backend/src/modules/pricing/`
- `backend/src/modules/payments/payment-checkout.routes.ts`
- `backend/src/modules/payments/payment.service.ts`
- `backend/src/workers/dispatch-settlement.ts`
- `frontend/src/components/product/PriceSummary.tsx`
- `frontend/src/hooks/use-checkout.ts`

- [ ] Add env-backed signing price fields:
  - `PRICE_ADVANCED_SIGNATURE_CENTS`
  - `PRICE_QUALIFIED_SIGNATURE_CENTS`
  - `PRICE_QUALIFIED_IDENT_ONE_TIME_CENTS`
- [ ] Extend quote and checkout pricing to include signing surcharges.
- [ ] Add the one-time QES ident fee rule based on signer-profile reuse state.
- [ ] Define and implement the authorization-TTL policy:
  - authorize near signing time for reused-ident/AES flows
  - create or refresh authorization after ident for first-time QES flows
- [ ] Change non-visual capture logic to capture only after `signed`.
- [ ] Define partial-refund behavior for `signed` + dispatch rejected:
  - refund dispatch charges
  - preserve signing/ident charges where service was already rendered
- [ ] Add tests for visual vs AES vs QES pricing/capture paths.
- [ ] Commit.

**Critical review gate**

- avoid computing ident fee from frontend hints
- compute it server-side from signer-profile state only
- do not assume one long-lived Stripe authorization survives first-time QES ident
- do not leave post-sign dispatch rejection refund policy implicit

### Phase 4: Implement the Skribble adapter and signing service

**Why fourth:** once lifecycle and payment semantics exist, provider integration can target stable state.

**Files likely touched**

- `backend/src/modules/signing/adapters/signing.adapter.ts`
- new `backend/src/modules/signing/adapters/skribble.adapter.ts`
- new `backend/src/modules/signing/signing.service.ts`
- new `backend/src/modules/signing/signing.routes.ts`
- new `backend/src/modules/signing/signing.webhook.routes.ts`
- `backend/src/modules/signing/index.ts`
- `backend/src/shared/config/env.ts`

- [ ] Add Skribble env/config and capability wiring.
- [ ] Implement ident session creation.
- [ ] Implement signing session creation from frozen PDF bytes and hash.
- [ ] Implement signed artifact retrieval and evidence persistence.
- [ ] Implement webhook verification and idempotent state updates.
- [ ] Add retry/reconciliation paths for expired, cancelled, failed, and provider-outage cases.
- [ ] Commit.

**Critical review gate**

- webhook handlers must be idempotent
- provider state must land in `draft_signing_sessions`, not just draft columns

### Phase 5: Implement signer identity reuse and re-identification

**Why fifth:** this is the biggest QES-specific conversion dependency.

**Files likely touched**

- new `backend/src/modules/signing/signer-profile.service.ts`
- session/resume helpers under `backend/src/modules/sessions/`
- new frontend resume/re-auth entrypoints under `frontend/src/app/[locale]/`
- email helpers if magic-link mail is reused

- [ ] Add signer lookup by verified email + phone hash.
- [ ] Add reuse eligibility and 48-hour pre-expiry refusal logic.
- [ ] Add “identify as a different person” branch.
- [ ] Add re-identification triggers for changed phone / expired ident.
- [ ] Add tests for reuse, expiry, and identity-swap behavior.
- [ ] Commit.

**Critical review gate**

- do not treat guest session identity as QES identity

### Phase 6a: Wire the basic frontend signing UI to the real backend state

**Why sixth:** the UI should reflect actual system state, not local placeholders.

**Files likely touched**

- `frontend/src/components/product/draft-flow/LogisticsStep.tsx`
- `frontend/src/components/product/SignatureAssuranceTierPicker.tsx`
- `frontend/src/components/product/review/ReviewPageReady.tsx`
- `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- `frontend/src/hooks/use-api.ts`
- `frontend/src/hooks/use-checkout.ts`
- locale files under `frontend/src/messages/`
- tests under `frontend/tests/`

- [ ] Persist assurance level on draft update.
- [ ] Surface assurance/signing state in review.
- [ ] Add checkout acknowledgment for electronic-original semantics.
- [ ] Add signing-required blocking for the basic provider flow.
- [ ] Replace `Coming soon` for enabled tiers only when backend capability is live.
- [ ] Align translations with actual runtime behavior.
- [ ] Commit.

**Critical review gate**

- do not expose enabled QES UI before provider + lifecycle are live in the current environment

### Phase 6b: Add reuse/resume UX on top of signer-profile support

**Why separate:** reuse/resume UX depends on Phase 5 and should not stay mixed into the basic enablement work.

**Files likely touched**

- `frontend/src/app/[locale]/resume/[token]/page.tsx`
- `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- signing-related components under `frontend/src/components/product/`
- locale files under `frontend/src/messages/`

- [ ] Add “welcome back, already identified” path.
- [ ] Add resume/re-auth path for expired browser sessions.
- [ ] Add “identify as a different person” branch.
- [ ] Add UX for expired ident and forced re-identification.
- [ ] Commit.

### Phase 7: Deliver recipient-side verification and QES artifact handling

**Why seventh:** QES is incomplete without recipient electronic delivery and public verification.

**Files likely touched**

- `backend/src/modules/rendering/pdf-access.ts`
- `backend/src/modules/orders/order.routes.ts`
- new `backend/src/modules/verification/verification.routes.ts`
- new `backend/src/modules/verification/verification.service.ts`
- `backend/src/workers/email.worker.ts`
- `backend/src/workers/email-templates.ts`
- `backend/src/modules/dispatch/dispatch-email-context.ts`
- PDF/QR rendering code under `backend/src/modules/rendering/`
- new frontend verify page if served through Next.js

- [ ] Separate signed electronic original from the current confirmation/dispatch-statement PDF.
- [ ] Add recipient email flow with signed PDF attachment.
- [ ] Add public verification token generation and lookup.
- [ ] Add `/verify/:token` page with certificate/timestamp/hash details.
- [ ] Add QR code to the posted paper copy that points to verification.
- [ ] Add tests for verification token access and artifact routing.
- [ ] Commit.

**Critical review gate**

- never reuse the current confirmation bundle as the QES artifact

### Phase 8: Retention, operations, and admin support

**Why eighth:** launch-ready signing needs evidence retention and support tooling.

**Files likely touched**

- `backend/src/modules/retention/index.ts`
- admin routes under `backend/src/modules/admin/`
- admin UI under `frontend/src/app/[locale]/admin/`
- metrics/logging modules
- operational docs under `docs/07-operations/`

- [ ] Exempt signed artifacts and verification records from ordinary short-lived cleanup.
- [ ] Add 10-year evidence-retention handling.
- [ ] Add admin visibility into signing state, provider refs, signer profile, and verification record.
- [ ] Add observability for signing failures, expiry, and webhook drift.
- [ ] Commit.

## Copilot CLI Challenge Prompts

Use a compact prompt against this plan after each major revision. Required model: `claude-opus-4.6`.

Prompt shape:

```text
Critique docs/superpowers/specs/2026-04-19-qualified-signature-design.md and docs/superpowers/plans/2026-04-19-qualified-signature-implementation.md.

Task:
- identify the 5 highest-risk omissions, incorrect assumptions, or sequencing mistakes
- be critical, not polite
- prefer architecture/runtime/payment/provider issues over wording
- return:
  1. fatal gaps
  2. risky assumptions
  3. sequencing fixes
  4. what to cut if we need a smaller first shippable slice

Keep it concise.
```

## Recommended First Shippable Slice

If the goal is still specifically **QES**, the smallest serious QES slice is:

1. persisted assurance/signing model
2. frozen PDF + hash
3. payment authorization that waits for signing
4. Skribble sandbox adapter
5. QES-only frontend path
6. signed artifact storage
7. recipient electronic delivery
8. public verification page

If the goal is a truly smaller **pipeline-validation slice**, Copilot CLI’s critique is correct: ship **AES first** and prove the infrastructure without video-ident friction.

Minimal AES-first slice:

1. schema + `ready_to_sign`
2. frozen PDF + hash
3. Skribble sandbox adapter for signing only
4. capture after `signed`
5. signed PDF stored and downloadable by sender

What can be deferred slightly:

- polished AES public launch
- richer admin tooling
- broad analytics dashboards
- Phase 3 Swisscom direct adapter work

What cannot be deferred without breaking the product promise:

- persisted signing state
- frozen/signed artifact separation
- signer identity reuse model
- recipient electronic original delivery
- public verification record

## Checks to Run During Planning/Implementation

- shared contract tests
- backend signing, payment, and rendering focused tests
- frontend review/checkout/signing state tests
- migration verification
- webhook idempotency tests
- retention tests for signed artifacts
