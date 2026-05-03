# SwissSign Signature Architecture

Status: scaffolded for SwissSign / SwissID integration, production-ready for internal flow testing, not wired to private live signing transaction endpoints yet.

## Scope

This codebase now supports a signature-aware order lifecycle without making the core postal-letter UX depend on signature.

Implemented now:

- Explicit signature flow modes:
  - `visual`
  - `swisssign_ses`
  - `swisssign_qes`
- Explicit signature session states and order fulfillment states
- SwissSign provider abstraction
- SwissSign mock provider for end-to-end UX and state testing
- SwissID OIDC discovery / authorize URL scaffolding
- Signature-aware payment timing and dispatch gating
- Dedicated return / pending / resume UX routes
- Idempotent signature callback event recording

Not implemented yet:

- Live SwissSign transaction API calls for session creation, callback verification, and signed-PDF retrieval
- Live SwissID token exchange and claim validation after OIDC callback
- Provider-specific webhook signature verification for SwissSign private callback schemas

## Modules

Backend:

- `backend/src/modules/signing/signature.routes.ts`
- `backend/src/modules/signing/provider-factory.ts`
- `backend/src/modules/signing/providers/swisssign.provider.ts`
- `backend/src/modules/signing/providers/swisssign.mock-provider.ts`
- `backend/src/modules/signing/providers/swisssign.placeholder-provider.ts`
- `backend/src/modules/signing/signature-session.service.ts`
- `backend/src/modules/signing/fulfillment.service.ts`
- `backend/src/modules/signing/fulfillment-response.service.ts`
- `backend/src/modules/signing/signed-document.service.ts`
- `backend/src/modules/signing/swissid/oidc.service.ts`

Frontend:

- `frontend/src/hooks/use-signature-fulfillment.ts`
- `frontend/src/app/[locale]/draft/[draftId]/signature/eligibility/page.tsx`
- `frontend/src/app/[locale]/draft/[draftId]/signature/return/page.tsx`
- `frontend/src/app/[locale]/draft/[draftId]/signature/pending/page.tsx`
- `frontend/src/app/[locale]/draft/[draftId]/signature/resume/page.tsx`
- `frontend/src/app/[locale]/draft/[draftId]/signature/mock/[providerSessionId]/page.tsx`

Shared:

- `shared/src/enums.ts`
- `shared/src/state-machines.ts`
- `shared/src/contracts/index.ts`
- `shared/src/schemas/index.ts`

## Canonical Flows

### Standard non-signature flow

1. Draft is reviewed and rendered
2. Fulfillment moves to `preview_ready` then `signature_not_required`
3. Checkout creates a normal Stripe `PaymentIntent`
4. Payment is captured
5. Dispatch can be enqueued
6. Final success requires dispatch acceptance

### SwissSign flow

1. Draft is reviewed and rendered
2. Fulfillment moves to `preview_ready` then `signature_selected`
3. User sees the SwissSign eligibility gate
4. Eligibility is confirmed and stored
5. Checkout creates a Stripe `PaymentIntent` with `capture_method=manual`
6. Payment becomes `authorized`
7. Signature session is created
8. User leaves the app for SwissSign / SwissID / wallet flow
9. Callback marks signature complete
10. Signed PDF is attached to the order
11. Authorized payment is captured
12. Dispatch can be enqueued
13. Final success requires dispatch acceptance

## Dispatch Rules

Server-side dispatch gating is centralized in:

- `backend/src/modules/dispatch/dispatch-eligibility.ts`
- `backend/src/modules/payments/payment-route-helpers.ts`

Rules:

- Non-signature flow: dispatch requires rendered PDF + captured payment
- SwissSign flow: dispatch requires rendered PDF + signed PDF attached + captured payment

The frontend cannot bypass this.

## Payment Timing

Current implementation:

- Standard flow keeps the existing immediate-capture-compatible checkout path
- SwissSign flows use Stripe authorization-first checkout via `capture_method=manual`
- Capture happens only after:
  - signature completion
  - signed document attachment

Then dispatch is allowed.

Important Stripe note:

- Manual capture filters out payment methods that do not support authorization holds
- This is relevant for SwissSign flows and should be reviewed deliberately during live rollout

## SwissID OIDC Scaffolding

Scaffolded endpoints and functions:

- `loadSwissIdDiscovery()`
- `buildSwissIdAuthorizeUrl()`
- `parseSwissIdCallbackQuery()`
- `POST /api/v1/drafts/:draftId/signature/oidc/authorize`
- `GET /api/v1/signatures/oidc/callback`

What is stored on the signature session:

- `oidcState`
- `oidcNonce`
- `pkceCodeVerifier`

What is still missing for live use:

- token exchange
- ID token validation
- claim mapping
- persistence of SwissID identity attributes needed for signing readiness

## Signed PDF Handling

Signed PDFs are stored as first-class file assets:

- file kind: `signed_pdf`
- storage path prefix: `signed-documents/<draftId>/<signatureSessionId>.pdf`

The dispatch package builder now prefers the signed PDF over the original rendered PDF when a signed asset exists for the draft/payment pair.

The confirmation PDF bundle also prefers the signed PDF when present.

## Callback / Webhook Handling

Implemented routes:

- `POST /api/v1/webhooks/signatures/swisssign`
- `POST /api/v1/drafts/:draftId/signature/mock/:providerSessionId/callback`

Behavior:

- provider callback is normalized into a provider-agnostic result
- event is recorded with a unique `eventKey`
- duplicate callbacks are ignored idempotently
- terminal success attaches the signed PDF and captures payment

## Environment Variables

Signature:

- `SIGNATURE_PROVIDER_MODE`
- `SIGNATURE_CALLBACK_SECRET`
- `SIGNATURE_PENDING_TTL_MINUTES`

SwissID:

- `SWISSID_OIDC_ISSUER`
- `SWISSID_OIDC_CLIENT_ID`
- `SWISSID_OIDC_CLIENT_SECRET`
- `SWISSID_OIDC_REDIRECT_URI`
- `SWISSID_OIDC_SCOPES`
- `SWISSID_OIDC_STEPUP_PURPOSE`
- `SWISSID_OIDC_ENABLE_PKCE`

SwissSign:

- `SWISSSIGN_API_BASE_URL`
- `SWISSSIGN_API_KEY`

## Live SwissSign Integration Points Still Required

The live private API details still need to be inserted in these places:

1. `backend/src/modules/signing/providers/swisssign.placeholder-provider.ts`
   Replace placeholder throws with real HTTP calls

2. `backend/src/modules/signing/providers/swisssign.types.ts`
   Align DTOs with the real private request and callback schemas

3. `backend/src/modules/signing/signature.routes.ts`
   Confirm the real callback URL shape, auth mechanism, and any provider-side correlation fields

4. `backend/src/modules/signing/swissid/oidc.service.ts`
   Wire the real token exchange and ID token validation path once credentials and exact claims are known

## Retry / Failure Model

- Signature failure or expiry never marks the letter as sent
- Payment capture is skipped on signature failure
- Authorized payment is cancelled when supported
- Draft content stays intact
- The order can be restarted through the signature resume / retry path
