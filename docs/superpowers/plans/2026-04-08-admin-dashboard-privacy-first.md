# Admin Dashboard Privacy-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin dashboard production-ready with real search/case workflows and strict minimal provider retention.

**Architecture:** Remove raw provider payload persistence from the dispatch layer, add normalized admin case endpoints and safe reconciliation actions in the backend, and wire the frontend around search and case-detail flows instead of isolated panels.

**Tech Stack:** TypeScript, Fastify, Drizzle, Next.js, React Query, Vitest

---

### Task 1: Remove raw provider payload persistence from dispatch contracts

**Files:**
- Modify: `shared/src/dispatch-provider.ts`
- Modify: `shared/src/schemas/index.ts`
- Test: `shared/tests/dispatch-provider.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it("parses a status lookup with only normalized tracking metadata", () => {
  const result = DispatchStatusLookupSchema.parse({
    state: "accepted",
    providerReference: "delivery-5",
    trackingNumber: "98.40.541881.00002354",
    failureReason: null,
    checkedAt: new Date(),
  });

  expect(result.trackingNumber).toBe("98.40.541881.00002354");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace shared -- dispatch-provider.test.ts`
Expected: FAIL because `providerPayload` is still required in the shared schema/tests.

- [ ] **Step 3: Write minimal implementation**

```typescript
export const DispatchSubmitResultSchema = z.object({
  state: DispatchStateSchema,
  providerReference: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  failureReason: z.string().nullable(),
});

export const DispatchStatusLookupSchema = z.object({
  state: DispatchStateSchema,
  providerReference: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  failureReason: z.string().nullable(),
  checkedAt: z.coerce.date(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace shared -- dispatch-provider.test.ts`
Expected: PASS

### Task 2: Stop backend dispatch workers and services from storing provider payload blobs

**Files:**
- Modify: `backend/src/modules/dispatch/dispatch.service.ts`
- Modify: `backend/src/workers/submit-dispatch.worker.ts`
- Modify: `backend/src/workers/reconcile-dispatch.worker.ts`
- Test: `backend/tests/dispatch-workers.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
expect(mocks.transitionDispatchState).toHaveBeenCalledWith(
  mocks.currentDb,
  "dispatch-2a",
  "submitted",
  expect.not.objectContaining({ providerPayload: expect.anything() }),
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace backend -- dispatch-workers.test.ts`
Expected: FAIL because workers still forward `providerPayload`.

- [ ] **Step 3: Write minimal implementation**

```typescript
await transitionDispatchState(db, attempt.id, "submitted", {
  providerReference: result.providerReference ?? undefined,
  trackingNumber: result.trackingNumber ?? undefined,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace backend -- dispatch-workers.test.ts`
Expected: PASS

### Task 3: Add admin draft case-detail and manual reconciliation endpoints

**Files:**
- Modify: `shared/src/contracts/index.ts`
- Modify: `shared/src/query-keys.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`
- Modify: `backend/src/modules/admin/admin-actions.routes.ts`
- Test: `backend/tests/admin-sessions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it("normalizes admin search results to known admin destinations", () => {
  expect(getAdminSearchTarget({ kind: "dispatch_attempt", id: "1", draftId: "d1" })).toBe("/drafts/d1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace backend -- admin-sessions.test.ts`
Expected: FAIL because search/case helper contracts do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
reply.send({
  draft: {
    id: draft.id,
    status: draft.status,
    sessionId: draft.sessionId,
    paymentState: payment?.state ?? null,
    dispatchState: dispatch?.state ?? null,
    providerReference: dispatch?.providerReference ?? null,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace backend -- admin-sessions.test.ts`
Expected: PASS

### Task 4: Add frontend admin search and draft case pages

**Files:**
- Modify: `frontend/src/app/[locale]/admin/admin-sidebar.tsx`
- Modify: `frontend/src/app/[locale]/admin/admin-api.ts`
- Create: `frontend/src/app/[locale]/admin/search/page.tsx`
- Create: `frontend/src/app/[locale]/admin/drafts/[id]/page.tsx`
- Modify: `frontend/src/app/[locale]/admin/sessions/[id]/page.tsx`
- Test: `frontend/tests/admin-paths.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it("builds admin links for the new search route", () => {
  expect(getAdminPagePath("/en-CH/admin/overview", "search")).toBe("/en-CH/admin/search");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace frontend -- admin-paths.test.ts`
Expected: FAIL if route assumptions are incomplete.

- [ ] **Step 3: Write minimal implementation**

```tsx
{ href: "search", label: "Search" }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace frontend -- admin-paths.test.ts`
Expected: PASS

### Task 5: Document the minimal ePost retention rule

**Files:**
- Modify: `docs/07-operations/security-and-privacy.md`
- Modify: `docs/07-operations/admin-and-support.md`

- [ ] **Step 1: Add explicit documentation**

```md
- retain only the minimum provider references required to reconcile or re-query dispatch state
- do not persist raw ePost payloads for admin inspection
```

- [ ] **Step 2: Verify wording is consistent with the approved design**

Run: `rg -n "raw ePost payloads|minimum provider references|required to reconcile or re-query" docs/07-operations/security-and-privacy.md docs/07-operations/admin-and-support.md`
Expected: Matching lines returned in both docs

### Task 6: Verify integrated behavior

**Files:**
- Modify: `backend/src/db/schema.ts`
- Modify: `backend/drizzle/0004_dispatch_quote_cache_and_rate_matrix.sql` or add new migration if needed

- [ ] **Step 1: Add migration or schema alignment for dropped payload persistence**

```sql
ALTER TABLE dispatch_attempts DROP COLUMN IF EXISTS provider_payload;
ALTER TABLE dispatch_status_events DROP COLUMN IF EXISTS provider_event_data;
```

- [ ] **Step 2: Run focused verification**

Run: `npm test --workspace shared -- dispatch-provider.test.ts && npm test --workspace backend -- dispatch-workers.test.ts admin-sessions.test.ts && npm test --workspace frontend -- admin-paths.test.ts`
Expected: PASS
