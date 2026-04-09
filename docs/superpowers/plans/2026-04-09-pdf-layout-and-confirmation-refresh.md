# PDF Layout And Confirmation Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the preview, final letter PDF, and ePost submission assumptions around one right-window Swiss layout, while simplifying the confirmation PDF design and copy.

**Architecture:** Keep the implementation in the existing preview and rendering files, but lock both surfaces to the same postal geometry and ordering. Update the ePost payload and pricing assumptions to `windowLocation: RIGHT`, then tighten tests around the new layout and the cleaned confirmation record.

**Tech Stack:** React, Next.js, Vitest, Puppeteer HTML-to-PDF rendering, shared Zod contracts

---

### Task 1: Lock right-window provider assumptions

**Files:**
- Modify: `shared/src/contracts/index.ts`
- Modify: `backend/src/modules/dispatch/dispatch-pricing-input.service.ts`
- Modify: `backend/src/modules/dispatch/dispatch-rate-matrix-sync.service.ts`
- Modify: `backend/src/modules/dispatch/adapters/epost.adapter.ts`
- Modify: `backend/src/modules/pricing/public-pricing.service.ts`
- Test: `backend/tests/dispatch-pricing-input.test.ts`
- Test: `backend/tests/pricing.test.ts`
- Test: `backend/tests/epost-reference-pricing.test.ts`
- Test: `shared/tests/contracts.test.ts`

- [ ] Write failing tests for `RIGHT` window assumptions.
- [ ] Run the targeted pricing/provider tests and confirm they fail on `LEFT`.
- [ ] Update the canonical pricing, payload, and contract values to `RIGHT`.
- [ ] Re-run the targeted tests until they pass.

### Task 2: Align preview and final letter PDF geometry

**Files:**
- Modify: `frontend/src/components/product/LetterPreview.tsx`
- Modify: `frontend/src/lib/letter-content.ts`
- Modify: `backend/src/modules/rendering/render.service.ts`
- Test: `frontend/tests/letter-preview-layout.test.ts`
- Test: `frontend/tests/workspace-layout.test.ts`
- Test: `backend/tests/regression-pdf-template.test.ts`
- Test: `backend/tests/render-service.test.ts`

- [ ] Write failing tests for sender top-left, right-side recipient block, logistics line above recipient, place/date below recipient, and removal of the sender one-liner.
- [ ] Run the targeted preview/render tests and confirm the old loose layout fails them.
- [ ] Implement the shared geometry in the preview and final PDF renderer.
- [ ] Re-run the targeted preview/render tests until they pass.

### Task 3: Clean up confirmation PDF design and mock copy

**Files:**
- Modify: `backend/src/modules/rendering/confirmation-document.ts`
- Test: `backend/tests/confirmation-document.test.ts`

- [ ] Write failing tests for a plain background, simpler logo, red tracking emphasis, and preview-mode copy that avoids `test` language.
- [ ] Run the targeted confirmation document test and confirm the current design fails.
- [ ] Implement the simplified confirmation layout and revised copy.
- [ ] Re-run the targeted confirmation document test until it passes.

### Task 4: Verify the integrated behavior

**Files:**
- No new source files expected

- [ ] Run the full targeted backend and frontend test set covering pricing assumptions, letter rendering, preview layout, and confirmation PDF output.
- [ ] Build the shared package if the runtime exports need regeneration.
- [ ] Review the changed surfaces for stray `LEFT` assumptions or stale `test` wording.
