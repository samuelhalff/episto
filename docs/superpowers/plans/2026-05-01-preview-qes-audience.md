# Preview, QES, and Audience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve drafting preview ergonomics, clean up the QES waitlist CTA, and add exportable admin audience lists.

**Architecture:** Keep the current drafting shell and modal patterns, but widen the desktop preview adaptively and loosen fullscreen height caps. Extend the existing admin metrics area with a small dedicated audience endpoint and page rather than inventing a separate subsystem.

**Tech Stack:** Next.js app router, React, Tailwind utility classes, Fastify, Drizzle, Vitest.

---

### Task 1: Lock the regression contract

**Files:**

- Modify: `frontend/tests/workspace-layout.test.ts`
- Modify: `frontend/tests/regression-admin-responsive.test.ts`
- Modify: `frontend/src/app/[locale]/admin/admin-api.test.ts`
- Modify: `backend/tests/admin-metrics.test.ts`

- [ ] Add failing tests that assert:
  - adaptive preview pane width and desktop content cap
  - fuller desktop preview sheet height
  - non-overlapping QES CTA structure
  - admin audience fetch/export helpers and response typing
  - audience page/sidebar presence

### Task 2: Fix the drafting preview layout

**Files:**

- Modify: `frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx`
- Modify: `frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx`
- Modify: `frontend/src/components/product/LetterPreviewModal.tsx`

- [ ] Implement the smallest layout changes needed to satisfy the new preview sizing tests.

### Task 3: Fix the QES waitlist CTA

**Files:**

- Modify: `frontend/src/components/product/SignatureAssuranceTierPicker.tsx`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`

- [ ] Make the unavailable QES tier read as a clear waitlist action and ensure badge/icon layout remains stable.

### Task 4: Add admin audience contracts, routes, and UI

**Files:**

- Modify: `shared/src/contracts/index.ts`
- Modify: `frontend/src/app/[locale]/admin/admin-api.ts`
- Modify: `frontend/src/app/[locale]/admin/admin-sidebar.tsx`
- Add: `frontend/src/app/[locale]/admin/audience/page.tsx`
- Modify: `backend/src/modules/admin/admin-metrics.routes.ts`

- [ ] Add typed audience responses, CSV export support, a new admin audience page, and matching backend queries.

### Task 5: Verify and deploy

**Files:**

- None required beyond the implementation above.

- [ ] Run focused frontend/backend tests.
- [ ] Run `npm run typecheck`.
- [ ] Deploy to `episto.ch`.
- [ ] Run live smoke checks for the app and admin-impacting API surfaces.
