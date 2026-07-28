# SwissSign Readiness Audit

Date: `2026-04-20`

> **Historical record — obsolete.** QES and the SwissSign / SwissID scaffolding this audit prepared
> were **removed on 2026-06-10** (`docs/superpowers/plans/2026-06-10-remove-qes-swisssign-signing.md`).
> `shared/src/enums.ts:78` now defines `SignatureFlowMode` as `{ none, visual }`, and no signature
> session, provider, or eligibility object exists in `backend/src/db/schema/`. Nothing below
> describes a planned or pending piece of work; it is kept only as a snapshot of the seams as they
> stood on 2026-04-20. See [`../04-product/signatures-and-attachments.md`](../04-product/signatures-and-attachments.md)
> for the live signature model.

## Scope

Audit of the current draft, preview, payment, dispatch, resume, and signing seams before adding SwissSign / SwissID readiness.

## Current flow

1. Session bootstrap
   - Guest sessions are created and resumed through `backend/src/modules/sessions/*`.
   - Resume is token-based and already supports cross-page recovery.

2. Drafting and review
   - Mutable draft state lives in `draft_letters`.
   - Review is triggered by `POST /v1/drafts/:draftId/review` in `backend/src/modules/drafting/draft.routes.ts`.
   - Review creates an immutable snapshot, moves the draft to `reviewed` then `rendering`, and enqueues PDF rendering.

3. Preview and PDF generation
   - Preview data comes from `GET /v1/drafts/:draftId/preview`.
   - Final PDF rendering is handled by `backend/src/workers/render-pdf.worker.ts` and `backend/src/modules/rendering/*`.
   - Render completion sets draft status to `ready` for visual signatures and `ready_to_sign` for non-visual tiers.

4. Checkout and payment
   - Review leads directly to `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`.
   - Checkout uses `frontend/src/hooks/use-checkout.ts` and `POST /v1/drafts/:draftId/checkout`.
   - Payment state lives in `payment_attempts`.
   - Stripe webhooks and payment polling normalize payment state through `transitionPaymentState(...)`.

5. Dispatch
   - Payment authorization or capture currently triggers `enqueueDispatchIfSnapshotReady(...)`.
   - Dispatch submission runs in `backend/src/workers/submit-dispatch.worker.ts`.
   - Dispatch state lives in `dispatch_attempts` plus append-only `dispatch_status_events`.

6. Confirmation and order status
   - Draft-scoped confirmation page is `frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx`.
   - Public order-status page is `frontend/src/app/[locale]/status/[orderToken]/page.tsx`.
   - Both pages currently surface payment and dispatch only.

## Existing signing seam

- Shared enums already include `SignatureAssuranceLevel`, `SigningState`, and `ready_to_sign`.
- Backend has a thin provider-agnostic signing adapter seam in `backend/src/modules/signing/adapters/signing.adapter.ts`.
- The current signing module is still stub-only. No signing session records, no callback flow, no signed-document attachment flow, and no frontend return/resume flow exist yet.

## Current risks

1. Success is shown too early for future signature flows.
   - The confirmation page treats `authorized` as a success state.
   - That is not acceptable once signature completion becomes a prerequisite.

2. Dispatch is payment-driven, not fulfillment-driven.
   - Dispatch can be enqueued after payment authorization/capture without any signature gate.

3. `ready_to_sign` has no operational lifecycle behind it.
   - There is no persisted signature session, readiness check, callback handling, or signed-document retrieval.

4. Order truth is fragmented.
   - Draft status, payment state, and dispatch state exist, but there is no explicit order fulfillment state spanning signature, payment capture, and dispatch acceptance.

5. Confirmation and status surfaces cannot explain signature waiting states.
   - They only understand payment and dispatch.

6. Repo guidance is currently contradictory for provider direction.
   - `docs/08-guardrails/open-decisions.md` and `docs/04-product/qualified-signatures.md` still lock QES provider direction to Skribble.
   - The current task explicitly requires SwissSign / SwissID readiness scaffolding instead.

## Extension points that are good enough to build on

- Session and resume-token infrastructure already exists.
- Draft snapshotting and frozen-PDF render flow already exist.
- Payment normalization already distinguishes `authorized` from `captured`.
- Dispatch already has queue-based submission and idempotent-ish state transitions.
- The frontend already has distinct review, checkout, confirmation, and public status surfaces.

## Recommended implementation direction

- Keep the current drafting and rendering flow.
- Add a signature domain and explicit order-fulfillment workflow beside the existing draft, payment, and dispatch machines.
- Insert SwissSign eligibility and signature orchestration between review and final capture/dispatch.
- Keep SwissSign private transaction details behind typed provider interfaces and a mock adapter until official API details are available.
