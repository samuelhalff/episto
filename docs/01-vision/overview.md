# Swiss Mail — Project Overview

**Product:** Swiss Mail  
**Last updated:** 2026-03-15  
**Status:** Foundation phase — TypeScript boundaries prepared; feature implementation not yet started

---

## 1. What This Is

Swiss Mail is a premium formal-letter product with integrated Swiss postal dispatch. It helps people prepare and send serious letters properly, with minimal friction.

Operationally, Swiss Mail owns drafting, review, canonical PDF generation, dispatch metadata
preparation, provider submission, and status normalization. Swiss Mail does not run its own print
facility or physical mail workflow. See [Provider Submission Model](../04-product/provider-submission-model.md).

The user journey is:
1. User describes what they need — typing or dictation. No prepared document required.
2. AI extracts intent, asks the right questions, and generates a properly structured formal letter
3. System produces a clean A4 draft with correct tone, structure, and formatting
4. User reviews with an excellent preview, edits any zone with precision
5. User reaches confidence: "this is right" — then selects delivery, pays, and confirms
6. Dispatch submission and any later tracking exposure are handled through a provider abstraction layer

The product enters the user journey *before any competitor does* — at the moment when the user knows they need to write something formal but hasn't started. The value is in the preparation, not just the dispatch.

> **This is not a self-operated mail house.** This is a premium letter preparation tool where
> provider submission is the natural conclusion, not the product itself.

---

## 2. Documentation Philosophy

This documentation pack is designed to be **LLM hallucination-proof**:

- **Decided facts** are stated as explicit decisions
- **Provider facts** are separated from provisional conclusions
- **Unresolved items stay unresolved** — they are not resolved by assumption
- **Implementation packs forbid silent guessing** — any unknown must be surfaced, not defaulted
- **No placeholder features, mock integrations, fake references, or dummy data** appear anywhere in planning

If a code implementation conflicts with these docs, **the docs win** unless a newer explicit decision replaces them.

The docs must also be **self-contained**. No implementer should need access to prior chat sessions,
oral history, or unpublished notes to determine the correct behavior.

---

## 3. Source-of-Truth Hierarchy

When facts conflict or are uncertain, this order governs:

| Priority | Source |
|---|---|
| 1 | Official current provider documentation or contracts, when the feature depends on an external provider |
| 2 | `docs/08-guardrails/open-decisions.md` and other current guardrail docs in `docs/08-guardrails/` |
| 3 | Current canonical product, architecture, build-pack, and operations docs in `docs/03-*` through `docs/07-*` |
| 4 | Orientation and strategy material in `README.md` and `docs/01-vision/*` |

If an answer exists only in prior thread history and not in the repository, treat that as a
documentation defect, not as hidden truth.

---

## 4. Core Principles

| Principle | Meaning |
|---|---|
| **Budget-conscious** | Avoid expensive architecture vanity and unnecessary moving parts |
| **Reliability first** | Never trade operational truth for flashy UX |
| **Speed with discipline** | Move fast only where decisions are explicit |
| **No-nonsense behavior** | Simple, calm, direct, auditable |
| **No placeholder thinking** | If something is unknown, keep it unknown; do not fake completeness |
| **Maintainability over cleverness** | Centralize contracts, minimize drift, keep module boundaries obvious |
| **Production realism only** | No mock provider flows, no fake tracking, no imaginary postal guarantees |
| **Trust over gimmicks** | AI is a hidden assistant, not the product story |
| **Letter quality is the product** | Dispatch is the natural conclusion, not the value proposition |

---

## 5. Decision Standard

Every unresolved implementation-significant decision must:

1. Document **three real options**
2. Evaluate each against: budget, reliability, speed, security, maintenance, UX clarity
3. **Choose the best option** or explicitly block implementation until a decision is approved

No unresolved implementation-significant decision may be left as an implicit default in code.

---

## 6. Locked MVP Direction

### Stack
- Monorepo: separate `frontend/`, `backend/`, `shared/`
- Frontend: Next.js + TypeScript, Tailwind, shadcn/ui (primitives only)
- Backend: Node.js + TypeScript, modular monolith
- Database: PostgreSQL
- Object storage: S3-compatible
- Payments: Stripe (CHF only)
- PDF: HTML/CSS to PDF
- Provider interaction: mandatory adapter pattern

### Product
- Switzerland only
- Consumer-first launch; guest-first access model
- Broad formal-letter scope — not a single use case
- Premium but accessible positioning — quality, not price
- AI stays in the background; trust and clarity stay in the foreground
- Product thesis: premium formal-letter preparation with integrated dispatch
- Guided drafting workspace: chat plus live preview
- Single A4 template
- Standard and registered mail in scope
- Short-lived content retention with minimal transactional persistence

---

## 7. Still Open

Provider onboarding still requires current technical documentation, but the top-level provider and
hosting choices are now locked.

| Item | Notes |
|---|---|
| Exact Swiss Post onboarding details | Provider path is locked; implementation still needs current Swiss Post docs and sandbox access |
| Exact provider product/service mapping | Must come from current Swiss Post-issued onboarding material before adapter internals are hardcoded |

The following items have been **locked** since the initial documentation phase:
retention durations (configurable defaults), email provider (Resend), AI provider (Azure-hosted
model API), dispatch provider path (direct Swiss Post API), hosting topology
(Infomaniak-centered), auth approach (guest-first, no accounts), monitoring baseline (structured
logs + error tracking), queue strategy (BullMQ + Redis), validation (shared Zod schemas).

See [Open Decisions](../08-guardrails/open-decisions.md) for the full locked vs open register.

---

## 8. Pre-Dev Gate

The documentation and design gate has been cleared. Implementation can proceed on all modules
except Swiss Post-specific adapter internals that depend on current onboarding docs.

Before production launch, the remaining provider-onboarding blocker must be resolved:

- [x] Documentation hardening and recursive closeout complete
- [x] Each blocking decision has three-option analysis and a chosen or recommended path
- [x] No planned module depends on placeholder behavior
- [x] No unresolved provider capability is encoded as if it were fact

---

## 9. Implementer Reading Order

Use these paths depending on your role. Start with your primary path before moving to others.

### Path 1 — Architecture Constraints (start here if you're implementing anything)
1. [Stack & Tooling Decisions](../05-architecture/stack-decisions.md) — locked technology choices
2. [System Contracts & State Models](../05-architecture/system-contracts.md) — canonical entities, enums, state machines, API boundaries
3. [AI Implementation Rules](../08-guardrails/ai-implementation-rules.md) — hard rules for AI-assisted development
4. [Non-Goals & Forbidden Shortcuts](../08-guardrails/non-goals.md) — things that must not be built or faked

### Path 2 — Product Understanding (UX and flows)
1. [Product Scope & Positioning](product-scope.md) — what the product is and is not
2. [Provider Submission Model](../04-product/provider-submission-model.md) — operational model and responsibility split
3. [User Flows & UX](../03-ux/user-flows.md) — canonical user journeys
4. [Letter Generation & Prompt Logic](../04-product/letter-generation.md) — AI drafting mechanics
5. [Document Template & PDF Rules](../04-product/a4-template-specification.md) — A4 layout and rendering constraints

### Path 3 — Technical Specs (building specific modules)
1. [Build Packs](../06-build-packs/) — frontend, backend, admin ops
2. [Database Schema](../05-architecture/database-schema.md) — canonical data model
3. [API Contracts](../05-architecture/api-contracts.md) — backend/frontend boundaries
4. [File Handling & Upload Rules](../04-product/file-handling.md) — storage, mime types, size limits

### Path 4 — Provider Safety (dispatch, tracking, postal integration)
1. [Provider Certainties & Unknowns](../08-guardrails/provider-certainties.md) — what is known vs unknown
2. [Provider Submission Model](../04-product/provider-submission-model.md) — canonical product truth before provider specifics
3. [Swiss Post Appendix](../08-guardrails/swiss-post-appendix.md) — verified facts and forbidden assumptions

### Path 5 — Decisions & Open Questions
1. [Open Decisions](../08-guardrails/open-decisions.md) — blocking and non-blocking decisions with three-option analysis

---

## 10. Documentation Map

### 01-vision — Product vision and strategy
- [overview.md](overview.md) — this file
- [product-scope.md](product-scope.md) — scope, positioning, trust boundaries
- [business-model.md](business-model.md) — GTM, revenue model, KPIs
- [roadmap.md](roadmap.md) — phases, open decisions, review standard
- [competitive-landscape.md](competitive-landscape.md) — competitor profiles and positioning

### 02-brand — Design and identity
- [design-system.md](../02-brand/design-system.md)
- [naming-and-identity.md](../02-brand/naming-and-identity.md)
- [voice-and-tone.md](../02-brand/voice-and-tone.md)
- [seo-strategy.md](../02-brand/seo-strategy.md)

### 03-ux — User experience
- [user-flows.md](../03-ux/user-flows.md)
- [page-specifications.md](../03-ux/page-specifications.md)
- [component-library.md](../03-ux/component-library.md)
- [mobile-patterns.md](../03-ux/mobile-patterns.md)
- [micro-interactions.md](../03-ux/micro-interactions.md)
- [marketing-pages.md](../03-ux/marketing-pages.md)

### 04-product — Product features
- [letter-generation.md](../04-product/letter-generation.md)
- [provider-submission-model.md](../04-product/provider-submission-model.md)
- [a4-template-specification.md](../04-product/a4-template-specification.md)
- [document-template.md](../04-product/document-template.md)
- [ai-provider-and-prompts.md](../04-product/ai-provider-and-prompts.md)
- [dictation-and-speech.md](../04-product/dictation-and-speech.md)
- [postal-dispatch.md](../04-product/postal-dispatch.md)
- [file-handling.md](../04-product/file-handling.md)
- [signatures-and-attachments.md](../04-product/signatures-and-attachments.md)
- [auth-billing-accounts.md](../04-product/auth-billing-accounts.md)
- [pricing-structure.md](../04-product/pricing-structure.md)
- [email-flows.md](../04-product/email-flows.md)
- [content-moderation.md](../04-product/content-moderation.md)

### 05-architecture — Technical architecture
- [stack-decisions.md](../05-architecture/stack-decisions.md)
- [system-contracts.md](../05-architecture/system-contracts.md)
- [database-schema.md](../05-architecture/database-schema.md)
- [api-contracts.md](../05-architecture/api-contracts.md)
- [session-management.md](../05-architecture/session-management.md)
- [realtime-strategy.md](../05-architecture/realtime-strategy.md)
- [backend-architecture.md](../05-architecture/backend-architecture.md)
- [frontend-architecture.md](../05-architecture/frontend-architecture.md)
- [data-model.md](../05-architecture/data-model.md)
- [error-taxonomy.md](../05-architecture/error-taxonomy.md)
- [i18n-rules.md](../05-architecture/i18n-rules.md)

### 06-build-packs — Implementation guides
- [frontend-build-pack.md](../06-build-packs/frontend-build-pack.md)
- [backend-build-pack.md](../06-build-packs/backend-build-pack.md)
- [admin-build-pack.md](../06-build-packs/admin-build-pack.md)

### 07-operations — Ops and support
- [deployment-and-ci.md](../07-operations/deployment-and-ci.md)
- [security-and-privacy.md](../07-operations/security-and-privacy.md)
- [admin-and-support.md](../07-operations/admin-and-support.md)
- [incident-response.md](../07-operations/incident-response.md)
- [pre-launch-checklist.md](../07-operations/pre-launch-checklist.md)
- [dev-workflow.md](../07-operations/dev-workflow.md)

### 08-guardrails — Rules and constraints
- [ai-implementation-rules.md](../08-guardrails/ai-implementation-rules.md)
- [non-goals.md](../08-guardrails/non-goals.md)
- [provider-certainties.md](../08-guardrails/provider-certainties.md)
- [swiss-post-appendix.md](../08-guardrails/swiss-post-appendix.md)
- [open-decisions.md](../08-guardrails/open-decisions.md)

---

## 11. Rule for Future Edits

Do not "fill in" an unresolved provider, API behavior, retention duration, or user-facing promise by intuition. Either:

- Cite the official source and update the decision, **or**
- Keep the item open and document the blocker

> **Never convert an open question into code by guessing.**
