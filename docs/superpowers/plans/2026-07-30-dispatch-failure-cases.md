# Dispatch Failure Case Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give administrators a linked, metadata-first dispatch failure queue and case page with safe provider rechecks that reconcile exact provider outcomes without duplicate sends or incorrect refunds.

**Architecture:** Extract provider reconciliation into a shared service used by BullMQ and a synchronous admin recheck route. Add exact ePost monitoring discovery for missing references, persist bounded provider diagnostics, and make terminal rejected cases diagnostic-only. Build a dispatch-first admin queue/detail API and frontend pages that never return letter content.

**Tech Stack:** Fastify, Drizzle/PostgreSQL, BullMQ/Redis locks, ePost oneAPI, Next.js, React Query, Vitest, shared Zod contracts.

---

## Review amendments

The independent review identified these mandatory constraints:

- `rejected` cases may be rechecked, but rechecking them must never settle payment,
  change them to `accepted`, or submit a new letter.
- A provider response that contradicts a terminal rejected case is recorded as a
  conflict and escalated; it is not silently reversed.
- Missing references may be discovered only by an exact ePost monitoring match on
  stored draft/case and snapshot identifiers. Name, address, email, and timing
  are not matching keys.
- Rejected resolution cannot be finalized while the payment ledger still says
  `captured`.
- Manual recheck returns the refreshed case synchronously and records both request
  and completion audit events.
- Provider error codes such as `PHYSICAL_DELIVERY_FAILED` must survive normalization.

## File map

### Backend

- Modify `backend/src/db/schema/dispatch.ts` and add a numbered Drizzle migration
  for bounded `provider_diagnostics` JSONB.
- Modify `shared/src/dispatch-provider.ts` and
  `backend/src/modules/dispatch/adapters/epost-response-mappers.ts` to carry
  normalized provider error codes.
- Modify `backend/src/modules/dispatch/adapters/epost-types.ts` and
  `backend/src/modules/dispatch/adapters/epost.adapter.ts` to support exact
  monitoring discovery and status lookup.
- Create `backend/src/modules/dispatch/dispatch-reconciliation.service.ts` for
  the shared, lock-protected reconciliation operation.
- Modify `backend/src/workers/reconcile-dispatch.worker.ts` to call the service.
- Modify `backend/src/workers/dispatch-settlement.ts` so rejected finalization
  cannot pass with a captured payment and failed fulfillment is updated.
- Modify `backend/src/modules/admin/admin-dispatch.routes.ts` and
  `backend/src/modules/admin/admin-case.routes.ts` for queue, case, and recheck
  APIs.
- Add backend tests for the provider contract, reconciliation service, admin
  routes, and settlement invariants.

### Shared/frontend

- Add shared admin dispatch queue/case/recheck response types in
  `shared/src/contracts/admin-dashboard.ts` or a focused
  `shared/src/contracts/admin-dispatch.ts`, exported from `shared/src/index.ts`.
- Modify `frontend/src/app/[locale]/admin/admin-api.ts` and
  `shared/src/query-keys.ts` with typed fetchers and query keys.
- Modify `frontend/src/app/[locale]/admin/overview/page.tsx` and
  `frontend/src/app/[locale]/admin/admin-overview-panels.tsx` to link counters.
- Create `frontend/src/app/[locale]/admin/dispatches/page.tsx` and
  `frontend/src/app/[locale]/admin/dispatches/[id]/page.tsx`.
- Add focused frontend tests and localized admin strings in all four locale files.

## Task 1: Define diagnostics and provider discovery contracts

**Files:**

- Modify: `shared/src/dispatch-provider.ts`
- Modify: `backend/src/modules/dispatch/adapters/epost-types.ts`
- Modify: `backend/src/modules/dispatch/adapters/epost-response-mappers.ts`
- Modify: `backend/src/modules/dispatch/adapters/epost.adapter.ts`
- Test: `backend/tests/epost-response-mappers.test.ts`
- Test: `backend/tests/epost-status-reconciliation.test.ts`

- [ ] **Step 1: Write failing tests for the exact provider error and monitoring match.**

```ts
it("extracts PHYSICAL_DELIVERY_FAILED from the ePost status detail", () => {
  expect(
    mapStatusLookup({
      status: "ERROR",
      document: {
        failedDocument: [
          {
            detail: [
              {
                deliveryChannel: "PHYSICAL",
                errorCode: "PHYSICAL_DELIVERY_FAILED",
                errorMessage: "Could not deliver physically, internal server error",
              },
            ],
          },
        ],
      },
    }),
  ).toMatchObject({
    state: "rejected",
    providerErrorCode: "PHYSICAL_DELIVERY_FAILED",
    failureReason: "Could not deliver physically, internal server error",
  });
});

it("matches monitoring only on both immutable application identifiers", () => {
  expect(
    findExactMonitoringDelivery(
      [
        {
          deliveryId: 8,
          detail: {
            documentMetadata: {
              senderCaseId: "draft-1",
              senderEndToEndId: "snapshot-1",
            },
          },
        },
      ],
      "draft-1",
      "snapshot-1",
    ),
  ).toEqual({
    providerReference: "8",
    matchedBy: "senderCaseId+senderEndToEndId",
  });
  expect(
    findExactMonitoringDelivery(
      [
        {
          deliveryId: 9,
          detail: {
            documentMetadata: {
              senderCaseId: "draft-1",
              senderEndToEndId: "other-snapshot",
            },
          },
        },
      ],
      "draft-1",
      "snapshot-1",
    ),
  ).toBeNull();
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail because the normalized code and exact matcher do not exist.**

Run: `npx vitest run backend/tests/epost-response-mappers.test.ts backend/tests/epost-status-reconciliation.test.ts`

Expected: FAIL with missing `providerErrorCode`/`findExactMonitoringDelivery` behavior.

- [ ] **Step 3: Add normalized provider fields.**

Extend the shared status lookup with:

```ts
providerErrorCode: z.string().nullable(),
```

and add a bounded diagnostics type containing only `status`, `providerErrorCode`,
`failureReason`, `providerReference`, `trackingNumber`, `checkedAt`, and optional
exact-match metadata. Keep raw provider responses out of the type.

- [ ] **Step 4: Implement nested ePost error extraction and exact monitoring matching.**

`mapStatusLookup` must inspect the documented failed-document detail and map
`errorCode`/`errorMessage`. Add an adapter method that calls
`GET /epost/deliveries/monitoring`, accepts a bounded response array, and returns
a provider reference only when exactly one record contains both the exact draft ID
and snapshot ID in `detail.documentMetadata.senderCaseId` and
`senderEndToEndId`. Return `null` for zero or multiple matches.

- [ ] **Step 5: Run focused tests and typecheck.**

Run: `npx vitest run backend/tests/epost-response-mappers.test.ts backend/tests/epost-status-reconciliation.test.ts && npm run typecheck --workspace shared --workspace backend`

Expected: PASS with no type errors.

## Task 2: Persist diagnostics and repair settlement invariants

**Files:**

- Modify: `backend/src/db/schema/dispatch.ts`
- Create: `backend/drizzle/0032_dispatch_provider_diagnostics.sql`
- Create: `backend/drizzle/0032_dispatch_provider_diagnostics.down.sql`
- Modify: `backend/src/workers/dispatch-settlement.ts`
- Test: `backend/tests/dispatch-settlement.test.ts`

- [ ] **Step 1: Write failing tests for rejected settlement and fulfillment.**

Cover these exact cases:

```ts
it("does not finalize rejected dispatch while payment remains captured", () => {
  expect(canFinalizeDispatchResolution("rejected", capturedPayment)).toBe(false);
});

it("moves dispatch_submitted fulfillment to failed after a confirmed rejection and refund", () => {
  expect(canTransitionFulfillment("dispatch_submitted", "failed")).toBe(true);
});
```

Also test that an already-succeeded refund is treated as refunded and that a
failed Stripe refund leaves the dispatch unresolved for retry rather than marking
it terminal.

- [ ] **Step 2: Run the settlement tests and confirm the invariant test fails.**

Run: `npx vitest run backend/tests/dispatch-settlement.test.ts`

Expected: FAIL because captured payment is currently accepted for rejected finalization.

- [ ] **Step 3: Add the JSONB column and migration.**

Add nullable `providerDiagnostics: jsonb("provider_diagnostics")` to
`dispatchAttempts`. The SQL migration must add the column and the down migration
must drop only that column. Do not alter or delete existing dispatch data.

- [ ] **Step 4: Make rejected settlement conservative.**

Remove `captured` from the rejected finalization predicate. If refund creation or
ledger synchronization fails, propagate the error so BullMQ retries; do not swallow
the failure and mark the dispatch terminal. Update rejected fulfillment through
`transitionDraftFulfillmentStatus(..., "failed")` after the refund is confirmed or
pending according to the existing state contract.

- [ ] **Step 5: Run settlement tests and migration rollback verification.**

Run: `npx vitest run backend/tests/dispatch-settlement.test.ts && npm run db:test-latest-rollback --workspace backend`

Expected: PASS; the latest migration can apply and roll back without touching unrelated columns.

## Task 3: Extract reconciliation service with safe terminal-state handling

**Files:**

- Create: `backend/src/modules/dispatch/dispatch-reconciliation.service.ts`
- Modify: `backend/src/workers/reconcile-dispatch.worker.ts`
- Modify: `backend/src/modules/admin/admin-actions.routes.ts`
- Test: `backend/tests/dispatch-reconciliation.service.test.ts`

- [ ] **Step 1: Write failing service tests.**

Test:

1. `unknown` + provider ref + `ERROR/PHYSICAL_DELIVERY_FAILED` transitions to
   rejected, refunds once, records diagnostics, and marks fulfillment failed.
2. `unknown` + provider ref + `DELIVERED` transitions to accepted and preserves
   the captured payment.
3. `rejected` + provider ref + repeated `ERROR` updates diagnostics only.
4. `rejected` + provider ref + `DELIVERED` records a conflict and does not change
   state or payment.
5. `unknown` without a provider ref performs exact monitoring discovery; zero or
   multiple matches remain unknown.
6. A concurrent second call returns the current state without a second provider
   request or second refund.

- [ ] **Step 2: Run the new tests and confirm they fail because the service is absent.**

Run: `npx vitest run backend/tests/dispatch-reconciliation.service.test.ts`

Expected: FAIL with missing service exports.

- [ ] **Step 3: Implement the service contract.**

Implement:

```ts
export interface ReconcileDispatchOptions {
  actor?: string;
  reason?: string;
  source: "system" | "admin";
}

export async function reconcileDispatch(
  db: Db,
  dispatchAttemptId: string,
  options: ReconcileDispatchOptions,
): Promise<DispatchReconciliationResult>;
```

Acquire the existing Redis dispatch lock, load the attempt, discover a missing
reference if the provider supports exact monitoring lookup, query provider status,
persist bounded diagnostics and `lastCheckedAt`, then apply only the permitted
state/payment/fulfillment transitions. Do not call submission APIs.

- [ ] **Step 4: Record manual request and completion events.**

The admin route records `reconciliation_requested`. The service records
`reconciliation_completed` only for manual calls, with prior state, resulting
state, provider reference, diagnostic code, and `resolved: boolean`. Scheduled
calls do not create admin actor events.

- [ ] **Step 5: Replace worker logic with a service call and rerun tests.**

The worker keeps BullMQ retry/error behavior but delegates all provider and
settlement logic to `reconcileDispatch`. Run:

`npx vitest run backend/tests/dispatch-reconciliation.service.test.ts backend/tests/dispatch-workers.test.ts backend/tests/dispatch-under-review.integration.test.ts`

Expected: PASS, including existing lock and retry behavior.

## Task 4: Build queue, case, and synchronous recheck APIs

**Files:**

- Modify: `backend/src/modules/admin/admin-dispatch.routes.ts`
- Modify: `backend/src/modules/admin/admin-case.routes.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`
- Create: `shared/src/contracts/admin-dispatch.ts`
- Modify: `shared/src/index.ts`
- Test: `backend/tests/admin-dispatch.routes.test.ts`

- [ ] **Step 1: Write failing route tests.**

Cover:

- queue rows include customer email, sender/recipient postal context, payment
  state/amount, dispatch state, failure category, and direct case ID;
- case detail includes payment breakdown, refund rows, dispatch events,
  diagnostics, fulfillment status, and diagnosis text;
- case detail does not contain `subject`, `body`, raw provider payloads, token
  hashes, or Stripe secrets;
- `POST /admin/dispatches/:id/recheck` requires a reason of at least five chars;
- unknown/rejected with a provider reference are eligible;
- rejected recheck returns refreshed diagnostics without settlement;
- manual completion audit event is written;
- concurrent/repeated requests do not duplicate provider calls.

- [ ] **Step 2: Run route tests and confirm they fail against the current API.**

Run: `npx vitest run backend/tests/admin-dispatch.routes.test.ts`

Expected: FAIL because the dispatch-first endpoints and response contracts do not exist.

- [ ] **Step 3: Add typed response contracts and queue query.**

Add strict response types for `AdminDispatchQueueResponse` and
`AdminDispatchCaseResponse`. Implement `GET /admin/dispatches?state=unknown|rejected`
with bounded pagination, urgency ordering (`unknown` first, then oldest update),
and joins to sessions, sender/recipient profiles, drafts, payments, and refunds.

- [ ] **Step 4: Add metadata-only case detail.**

Implement `GET /admin/dispatches/:id`. Return all operational fields described in
the spec plus a normalized diagnosis. Never select or serialize draft subject/body.
Include dispatch status events and support events, but sanitize event details to
the approved operational keys.

- [ ] **Step 5: Replace fire-and-forget manual recheck with synchronous service call.**

Implement `POST /admin/dispatches/:id/recheck` with `{ reason }`. Call the shared
service with `source: "admin"`, then reload and return the case detail. Preserve the
old route as a compatibility wrapper only if existing frontend/test consumers use
it; the wrapper must call the same service and must not enqueue a duplicate job.

- [ ] **Step 6: Run backend route/type checks.**

Run: `npx vitest run backend/tests/admin-dispatch.routes.test.ts backend/tests/admin-case.routes.test.ts && npm run typecheck --workspace backend --workspace shared`

Expected: PASS with strict response types.

## Task 5: Implement the admin queue and case pages

**Files:**

- Modify: `frontend/src/app/[locale]/admin/admin-api.ts`
- Modify: `shared/src/query-keys.ts`
- Modify: `frontend/src/app/[locale]/admin/admin-overview-panels.tsx`
- Modify: `frontend/src/app/[locale]/admin/overview/page.tsx`
- Create: `frontend/src/app/[locale]/admin/dispatches/page.tsx`
- Create: `frontend/src/app/[locale]/admin/dispatches/[id]/page.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Test: `frontend/tests/admin-dispatches.test.tsx`

- [ ] **Step 1: Write failing UI tests.**

Assert that:

- ambiguous and failed overview metrics render links to filtered queue URLs;
- queue renders customer, recipient, payment, provider, diagnosis, timestamps,
  and an open-case link;
- case page renders known facts and next action, but no letter body/subject;
- recheck requires a reason, shows pending state, and renders the returned case;
- provider conflict is visibly escalated and offers no resend action.

- [ ] **Step 2: Run the frontend test and confirm it fails.**

Run: `npx vitest run frontend/tests/admin-dispatches.test.tsx`

Expected: FAIL because the pages and linkable metric prop do not exist.

- [ ] **Step 3: Add API/query helpers.**

Add `fetchAdminDispatchQueue(state)`, `fetchAdminDispatchCase(id)`, and
`recheckAdminDispatch(id, reason)`. Add query keys for queue filters and case ID.

- [ ] **Step 4: Make priority metrics linkable.**

Extend each metric with optional `href`; render a semantic `Link` around the card
only when present. Wire ambiguous to `dispatches?state=unknown` and failed to
`dispatches?state=rejected`.

- [ ] **Step 5: Build the queue and case page using existing admin components.**

Use the project’s existing `SectionPanel`, `MetricCard`, admin spacing, and error/
loading patterns. The case page must use metadata labels and a diagnosis panel,
not content preview components. Recheck feedback must state whether the provider
confirmed acceptance, confirmed failure, remains unresolved, or produced a conflict.

- [ ] **Step 6: Add locale strings and run focused frontend checks.**

Run: `npx vitest run frontend/tests/admin-dispatches.test.tsx frontend/tests/admin-runtime.test.ts frontend/tests/admin-dashboard-ux-contract.test.ts`

Expected: PASS with all four locale message trees valid.

## Task 6: Production incident regression and deployment checks

**Files:**

- Test: `backend/tests/dispatch-reconciliation.service.test.ts`
- Test: `backend/tests/admin-dispatch.routes.test.ts`
- Test: `frontend/tests/admin-dispatches.test.tsx`

- [ ] **Step 1: Add the exact incident fixture.**

Use provider reference `8`, draft `7d97abcd-7de0-4c20-b37c-a993851f32a5`, snapshot
`75399f0a-5513-4d15-ae24-35179cb36a72`, provider code
`PHYSICAL_DELIVERY_FAILED`, payment `captured`, and expected final state:
dispatch `rejected`, payment `refunded`, fulfillment `failed`.

- [ ] **Step 2: Run the full local verification suite.**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run format
```

Expected: zero test failures, zero type errors, zero lint errors, and clean formatting.

- [ ] **Step 3: Run migration and production-safe checks.**

Run the latest migration rollback check, build all workspaces, and verify the
admin endpoints do not return content fields using an integration fixture.

- [ ] **Step 4: Deploy and verify health.**

Run `PROD_HOST=episto.ch ./scripts/deploy.sh`, then verify all production
containers are healthy, the admin overview loads, the queue contains no stale
unknown record for the reconciled incident, and the case page shows provider
reference `8`, rejected state, refund, and failed fulfillment.

- [ ] **Step 5: Perform a read-only provider recheck of the incident.**

Use the new admin recheck action with an operational reason. Confirm it performs
status lookup only, does not create a dispatch, does not issue a second refund,
and records the completed audit event.

## Plan self-review

- Spec coverage: queue links, metadata-only case page, provider discovery,
  structured diagnostics, shared reconciliation, rejected safety, audit events,
  payment/fulfillment correctness, tests, and deployment verification are all
  assigned above.
- Placeholder scan: no TODO/TBD or undefined follow-up steps are used.
- Type consistency: the shared provider status adds `providerErrorCode`; the
  bounded diagnostics object uses that same name; the reconciliation service
  returns the typed case response after the admin route reloads it.
- Safety check: no task authorizes resubmission from the admin path, raw payload
  retention, broad data deletion, or unverified provider matching.
