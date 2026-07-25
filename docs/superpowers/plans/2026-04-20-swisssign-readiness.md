# SwissSign Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare episto for future SwissSign / SwissID signature integration without inventing private APIs, while preserving the current non-signature send flow.

**Architecture:** Extend the existing draft, payment, and dispatch foundations with a new signature domain plus an explicit order-fulfillment workflow. Keep SwissID OIDC and SwissSign transaction handling behind config-backed services and mock adapters so the live provider can be plugged in later with minimal refactor.

**Tech Stack:** Next.js, Fastify, Drizzle, BullMQ, Stripe, shared Zod contracts

---

### Task 1: Lock the written direction first

**Files:**

- Modify: `docs/08-guardrails/open-decisions.md`
- Modify: `docs/04-product/qualified-signatures.md`
- Create: `docs/05-architecture/signature-architecture.md`

- [ ] Record that this change introduces SwissSign / SwissID readiness scaffolding and supersedes the older Skribble-specific implementation direction for this concern area.
- [ ] Keep live provider details explicitly unknown where private SwissSign signature endpoints are not documented.
- [ ] Document the intended product split: standard send remains first-class; SwissSign flows are optional and gated.

### Task 2: Add canonical shared contracts and lifecycle types

**Files:**

- Modify: `shared/src/enums.ts`
- Modify: `shared/src/state-machines.ts`
- Modify: `shared/src/schemas/index.ts`
- Modify: `shared/src/contracts/index.ts`

- [ ] Add provider-ready signature mode, eligibility, signature session, fulfillment, payment, and dispatch types.
- [ ] Keep existing visual signature support intact.
- [ ] Add explicit state transition helpers for the new workflow so backend and frontend read the same truth.

### Task 3: Persist signature and fulfillment state on the backend

**Files:**

- Modify: `backend/src/db/schema/*.ts`
- Create: `backend/drizzle/migrations/*`
- Create: `backend/src/modules/signatures/*`

- [ ] Add normalized tables for signature sessions and signature events.
- [ ] Add order-fulfillment state ownership in backend services instead of scattering workflow booleans.
- [ ] Preserve existing draft, payment, and dispatch tables; extend rather than replace.

### Task 4: Build SwissID OIDC and SwissSign provider scaffolding

**Files:**

- Create: `backend/src/modules/signatures/providers/swissid/*`
- Create: `backend/src/modules/signatures/providers/swisssign/*`
- Modify: `backend/src/shared/config/*`

- [ ] Add config-backed discovery loading, authorize URL generation, transient state storage, and callback parsing for SwissID OIDC.
- [ ] Add typed SwissSign provider interfaces and a realistic mock implementation for eligibility, identity step-up, session creation, status polling, callback handling, and signed-document retrieval.
- [ ] Do not invent private SwissSign transaction endpoints; leave typed TODO boundaries where real docs are still missing.

### Task 5: Refactor payment and dispatch orchestration for signature-aware fulfillment

**Files:**

- Modify: `backend/src/modules/payments/*`
- Modify: `backend/src/modules/dispatch/*`
- Modify: `backend/src/workers/*.ts`

- [ ] Keep the current standard flow working.
- [ ] For SwissSign flows, move to authorize → sign → capture → dispatch.
- [ ] Enforce dispatch eligibility server-side so signature-required letters cannot be dispatched early.
- [ ] Add idempotent callback processing and safe retry / expiry handling.

### Task 6: Add frontend UX gates and return/resume flows

**Files:**

- Modify: `frontend/src/app/[locale]/draft/[draftId]/*`
- Create: `frontend/src/app/[locale]/draft/[draftId]/signature/*`
- Modify: `frontend/src/components/product/**/*`
- Modify: `frontend/src/hooks/**/*`

- [ ] Extend signature selection near the end of the flow.
- [ ] Add a premium eligibility gate before payment capture for SwissSign modes.
- [ ] Add return, pending, resume, timeout, and failure screens driven by backend state rather than redirect params.
- [ ] Update success messaging so “completed” means signature finished when required, payment captured, and dispatch accepted.

### Task 7: Add tests and final handoff docs

**Files:**

- Create or modify: `backend/src/**/*.test.ts`
- Create or modify: `frontend/src/**/*.test.tsx`
- Create: `docs/05-architecture/2026-04-20-swisssign-handoff.md`

- [ ] Add focused tests for state transitions, payment sequencing, dispatch blocking, callback idempotency, and resume/pending behavior.
- [ ] Write a concise handoff stating what is complete, what is mocked, assumptions made, and exactly where live SwissSign data still needs to be inserted.
