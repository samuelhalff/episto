# SwissSign / SwissID Handoff

## Complete

- Signature flow domain types and state machines
- Draft fulfillment state persisted on `draft_letters`
- Signature sessions and signature events persisted in dedicated tables
- Signature-aware dispatch gating
- Signature-aware Stripe checkout:
  - standard flow keeps current capture behavior
  - SwissSign flow uses authorization-first checkout
- SwissSign mock provider and mock UX handoff
- Signed PDF storage and dispatch package preference
- Confirmation bundle preference for signed PDFs
- SwissID OIDC discovery / authorize / callback scaffolding
- Frontend eligibility, return, pending, resume, and mock screens

## Mocked

- SwissSign eligibility checks
- SwissSign session creation
- SwissSign callback payloads
- Signed PDF retrieval
- OIDC callback post-code handling beyond query validation

## Assumptions

- Signature choice still happens near the end of the flow
- The app must continue to work fully without SwissSign
- Live SwissSign transaction endpoints are not known yet and must not be invented
- SwissSign signing flows may require SwissID, wallet handoff, biometrics, and identity verification
- Signature-led flows can tolerate a different Stripe payment-method mix than the standard checkout path because manual capture is required

## Insert Live API Details Here

- Provider implementation:
  - `backend/src/modules/signing/providers/swisssign.placeholder-provider.ts`
- Provider DTO alignment:
  - `backend/src/modules/signing/providers/swisssign.types.ts`
- Callback normalization and verification:
  - `backend/src/modules/signing/signature.routes.ts`
- SwissID token exchange and identity claim handling:
  - `backend/src/modules/signing/swissid/oidc.service.ts`

## Technical Debt

- The new signature UI copy is currently English-first on the new signature-only screens
- SwissID OIDC is scaffolded but not yet part of a live identity proof chain
- The current mock provider models realistic status changes but not batch signing, partial signer readiness, or vendor-specific callback retry semantics
