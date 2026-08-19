# Draft Preview, Checkout, and Resume Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize manual draft previews, validate promo pricing before payment, bound checkout loading, and offer returning users a dismissible list of resumable drafts.

**Architecture:** Keep final promo authorization server-side and add a read-only draft-scoped promo quote endpoint that reuses the existing dispatch quote and promo service. Keep preview synchronization in the existing realtime/query layer. Mount a small resume modal in the shared marketing shell, using the existing `useDrafts` query and customer-flow path helpers.

**Tech Stack:** Fastify, Drizzle, React/Next.js, TanStack Query, Vitest, next-intl.

---

### Task 1: Lock down preview synchronization

**Files:**

- Modify: `frontend/src/hooks/use-letter-preview.ts`
- Test: `frontend/tests/draft-status-refresh.test.ts`

- [ ] **Step 1: Run the existing regression test and confirm the new preview assertion fails.**

Run: `npm test -- --run frontend/tests/draft-status-refresh.test.ts`

Expected: the existing tests pass and the new preview invalidation assertion fails because the field-update branch only calls `setStaleSince`.

- [ ] **Step 2: Invalidate the preview query on `field_update`.**

In the realtime subscription, retain `setStaleSince(Date.now())` and call `queryClient.invalidateQueries({ queryKey: queryKeys.draftPreview(draftId) })`. Keep `refreshPreview` unchanged as the explicit retry path.

- [ ] **Step 3: Run the focused test.**

Run: `npm test -- --run frontend/tests/draft-status-refresh.test.ts`

Expected: all tests pass.

### Task 2: Add the read-only promo quote contract

**Files:**

- Modify: `backend/src/modules/payments/payment-status.routes.ts`
- Test: `backend/tests/payment-checkout.routes.test.ts`

- [ ] **Step 1: Run the route regression and confirm the endpoint test fails with 404.**

Run: `npm test -- --run backend/tests/payment-checkout.routes.test.ts`

Expected: the new `/drafts/draft-1/promo-quote` test fails with status 404.

- [ ] **Step 2: Implement `POST /drafts/:draftId/promo-quote`.**

Add a strict Zod body schema requiring a trimmed code with the same maximum length as checkout. Authenticate with `requireSession`, verify the draft belongs to the session, resolve `resolveDisplayDispatchQuoteForDraft`, call `applyPromoToTotal(db, { code, baseTotalCents: quote.totalCents })`, and return the original quote with `totalCents` replaced by `finalCents` plus the promo metadata. Do not call `recordPromoRedemption`.

- [ ] **Step 3: Run the route test.**

Run: `npm test -- --run backend/tests/payment-checkout.routes.test.ts`

Expected: all route tests pass, including the no-redemption assertion.

### Task 3: Add the frontend promo quote hook and checkout state

**Files:**

- Create: `frontend/src/hooks/use-promo-quote.ts`
- Modify: `frontend/src/hooks/use-api.ts`
- Modify: `frontend/src/hooks/use-checkout.ts`
- Test: `frontend/tests/checkout.test.ts`

- [ ] **Step 1: Keep the frontend contract test red.**

Run: `npm test -- --run frontend/tests/checkout.test.ts`

Expected: the promo validation assertions fail because the hook and state do not exist.

- [ ] **Step 2: Implement the query hook.**

Create `usePromoQuote(draftId, promoCode, enabled)` with a 300ms debounced code, a query key containing the normalized code, `POST /v1/drafts/:draftId/promo-quote`, and disabled behavior for empty code or unavailable base pricing. Expose `data`, `isLoading`, `isError`, and the canonical API error. Export it from `use-api.ts`.

- [ ] **Step 3: Bound checkout initiation.**

Pass `signal: AbortSignal.timeout(30_000)` to the checkout POST in `use-checkout.ts`. Preserve the mutation’s normal error path so an abort clears `isProcessing` and the page can render a retryable error.

- [ ] **Step 4: Run the hook/checkout focused tests and frontend typecheck.**

Run: `npm test -- --run frontend/tests/checkout.test.ts && npm run typecheck -w frontend`

Expected: the contract tests pass and TypeScript reports no errors.

### Task 4: Render validated promo pricing and prevent premature payment

**Files:**

- Modify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- Modify: `frontend/src/components/product/PriceSummary.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Test: `frontend/tests/checkout.test.ts`

- [ ] **Step 1: Add the failing UI contract assertions.**

Assert that the page passes promo quote state to the price summary, displays validation feedback, and disables submission while a non-empty code is loading, invalid, or stale.

- [ ] **Step 2: Connect `usePromoQuote` to checkout.**

Use the hook with the current code and quote availability. Derive `promoCodeError`, `promoCodeValidated`, and the effective pricing quote. Clear displayed success when the user edits the code, and ensure a failed or pending non-empty code cannot submit.

- [ ] **Step 3: Extend `PriceSummary` for promo overrides.**

Accept an optional effective quote/promo result. Render original total, discount line, and final total in CHF. Keep existing review and non-promo callers behavior unchanged.

- [ ] **Step 4: Add all four locale strings.**

Add translations for checking a code, valid code, invalid code, discount, and final total; use the existing checkout namespace and preserve locale parity.

- [ ] **Step 5: Run focused tests, hardcoded-string checks, and typecheck.**

Run: `npm test -- --run frontend/tests/checkout.test.ts frontend/tests/price-summary.test.ts && npm run check:hardcoded-strings && npm run typecheck -w frontend`

Expected: all tests and checks pass.

### Task 5: Add the reusable returning-draft prompt

**Files:**

- Create: `frontend/src/components/product/ResumeDraftPrompt.tsx`
- Modify: `frontend/src/components/marketing/MarketingLayout.tsx`
- Modify: `frontend/src/hooks/use-draft.ts`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Test: `frontend/tests/resume-draft-prompt.test.tsx`

- [ ] **Step 1: Write runtime tests for filtering and dismissal.**

Cover: no prompt for no drafts; terminal drafts excluded; resumable drafts listed newest first; close writes a session-scoped dismissal; continue links to the existing customer-flow path; query errors do not render a blocking overlay.

- [ ] **Step 2: Run the tests and confirm they fail because the component does not exist.**

Run: `npm test -- --run frontend/tests/resume-draft-prompt.test.tsx`

Expected: module/import failure or missing behavior assertions.

- [ ] **Step 3: Implement the prompt as a reusable client component.**

Use `useDrafts`, filter out terminal states, sort by `updatedAt`, and render the existing modal/sheet primitives and action button components. Gate the first-load effect with session storage. Treat storage and API failures as no-op states. Link each item through `getCustomerFlowPath`.

- [ ] **Step 4: Mount it in the shared marketing layout.**

Render the prompt once from `MarketingLayout` so any marketing page’s first visit can trigger it without altering the draft flow or blocking initial page interaction.

- [ ] **Step 5: Add locale copy and run the focused component test.**

Run: `npm test -- --run frontend/tests/resume-draft-prompt.test.tsx && npm run typecheck -w frontend`

Expected: all prompt tests pass and the frontend compiles.

### Task 6: Full verification and independent review

**Files:**

- Review all modified files and the two design documents.

- [ ] **Step 1: Run the complete relevant test suite.**

Run: `npm test -- --run frontend/tests frontend/tests/checkout.test.ts backend/tests/payment-checkout.routes.test.ts backend/tests/promo-service.test.ts`

Expected: zero failing tests.

- [ ] **Step 2: Run repository checks.**

Run: `npm run typecheck && npm run lint && npm run format && npm run build`

Expected: all commands exit 0.

- [ ] **Step 3: Inspect the complete diff.**

Run: `git diff --check && git diff --stat && git status --short`

Confirm no unrelated files changed and no temporary artifacts are present.

- [ ] **Step 4: Ask a second Codex reviewer to inspect the diff and tests.**

Use the reasonix subagent with a bounded review-only prompt. Incorporate only technically justified findings, then rerun the affected checks.

- [ ] **Step 5: Report changed files and checks run.**

Include the final behavior, any deployment caveat, independent review findings, and exact verification results.
