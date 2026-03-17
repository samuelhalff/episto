# Copilot Instructions for Swiss Mail

Swiss Mail is a premium formal-letter product with integrated Swiss postal dispatch. It helps people prepare and send serious letters properly, with minimal friction. The repository has completed the documentation phase and has a prepared TypeScript foundation. Full feature implementation has not yet started.

## Documentation is the source of truth

The `docs/` directory is the canonical authority. Start at `docs/index.md` for navigation. If code conflicts with docs, the docs win unless a newer explicit decision replaces them. Read the docs before generating implementation code.

Key files for implementation safety:
- `docs/08-guardrails/swiss-post-appendix.md` — verified provider facts and forbidden assumptions
- `docs/05-architecture/stack-decisions.md` — locked technology choices
- `docs/05-architecture/system-contracts.md` — canonical entities, enums, state machines, and API boundaries
- `docs/08-guardrails/ai-implementation-rules.md` — hard rules for AI-assisted development
- `docs/08-guardrails/provider-certainties.md` — what is known vs unknown about external providers
- `docs/08-guardrails/non-goals.md` — things that must not be built or faked

## Repository structure

Monorepo with three top-level application directories (to be created):
- `frontend/` — Next.js + TypeScript, Tailwind, shadcn/ui primitives
- `backend/` — Node.js + TypeScript, modular monolith
- `shared/` — canonical TypeScript schemas, enums, and types used by both sides

## Stack decisions (locked)

- **Frontend:** Next.js, TypeScript, Tailwind, shadcn/ui (primitives only), custom product components
- **Backend:** Node.js, TypeScript, PostgreSQL, S3-compatible object storage, BullMQ + Redis (recommended)
- **Payments:** Stripe
- **PDF:** HTML/CSS to PDF
- **Validation:** Zod (recommended)
- **Currency:** CHF only
- **Target locales:** de-CH, fr-CH, it-CH, en-CH

## Architecture rules

- **Adapter pattern is mandatory.** All external provider interaction (postal dispatch, payment, tracking) must sit behind adapter boundaries. No provider-specific logic outside its adapter module.
- **Schema first.** Define canonical data shapes in `shared/` before writing feature code. Never duplicate schemas by hand between frontend and backend.
- **State machines are explicit.** All state transitions (dispatch, payment) must be logged and testable. See `docs/05-architecture/system-contracts.md` for canonical enums (`PaymentState`, `DispatchState`, etc.).
- **Frontend never calls external providers directly.** Frontend talks only to backend app contracts. No raw provider payloads in the UI.
- **Guest-first.** MVP must not require an account to draft and send a letter.
- **Retention is configurable.** Never hardcode permanent retention or specific durations — they are not yet decided.

## Anti-hallucination rules

These are the most critical rules for AI-assisted development:

- **Never invent provider behavior.** Do not fabricate endpoints, payload fields, tracking capabilities, or success meanings for Swiss Post, ePost, or any postal provider.
- **Never convert an open question into code.** If something is marked open/unknown in docs, do not resolve it by guessing. Stop and document the blocker.
- **Never fake success.** No mock success states in production flows. "Submitted" ≠ "accepted" ≠ "delivered". Barcode generation ≠ physical dispatch.
- **Unknown stays unknown.** If dispatch status is ambiguous, show it as ambiguous in the UI. Never collapse "pending" and "sent" into one message.
- **Old provider docs are suspect.** Legacy E-Post Print and Send material has reached end-of-life. Do not build against old manuals.

## Frontend conventions

- `components/ui/` — shadcn-derived primitives only
- `components/product/` — drafting, preview, checkout, confirmation flows
- `components/marketing/` — homepage, trust blocks, entry cards
- No rich-text editor by default; keep MVP editing simple
- All user-facing strings go through a message/i18n layer, never hardcoded in components
- Mobile-first; no desktop-only affordances in payment or confirmation flows

## Backend conventions

Backend modules: `sessions`, `drafting`, `rendering`, `files`, `payments`, `dispatch`, `tracking`, `retention`, `admin`.
<!-- Note: `accounts` is post-MVP and not in the canonical MVP module list. See backend-architecture.md. -->

- Backend owns all state transitions, adapter translation, and retention cleanup
- Payment and dispatch operations must be idempotent
- File uploads go to object storage, not database blobs; every file gets a metadata record and explicit deletion policy
- Storage keys use deterministic namespacing: `attachments/{sessionId}/{fileId}`, `signatures/{sessionId}/{fileId}`, `renders/{draftId}/{renderVersion}.pdf`
- Webhook events must map into canonical internal events

## Error handling

Map all errors to canonical families: validation, policy refusal, payment failure, dispatch rejection, dispatch ambiguity, provider outage, tracking unavailable, file upload failure, rendering failure, retention cleanup failure. User-facing messages must say what failed and what the user can do — never expose raw vendor jargon or claim success when state is ambiguous.

## Testing expectations

- State transitions need unit tests
- Adapter normalization needs tests
- Payment and dispatch idempotency needs tests
- File cleanup needs tests
- No test should assert fake provider capabilities as fact

## Build order for new features

1. Update docs/decisions
2. Define shared schemas and enums
3. Build backend state machines and adapters
4. Build frontend state and flows
5. Add provider integration details
6. Admin and polish
