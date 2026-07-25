# Remove QES / SwissSign Provider-Backed Signing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all QES / SwissSign provider-backed signature scaffolding (the `swisssign_ses` flow mode, `advanced` assurance level, SwissID OIDC, signature sessions/events, eligibility, and the 5 frontend signature pages) while keeping the live typed/drawn **visual** signature feature fully intact.

**Architecture:** With QES gone, `signatureFlowMode` is only ever `none` or `visual`, so every `isSwissSignFlowMode()` / `signatureRequired` branch is dead and collapses to the visual/none path. We prune consumers first (frontend + backend) so nothing references the QES surface, then simplify the shared contract/enum/state-machine surface, then drop the DB tables/enums via a manual migration, then clean env + docs, updating tests in lockstep.

**Tech Stack:** Fastify + Drizzle (Postgres) + BullMQ (backend), Next.js App Router + next-intl + TanStack Query (frontend), Zod contracts in `shared`, Vitest.

---

## Keep / Remove Boundary (read before any task)

**KEEP — the visual signature feature (typed + drawn):**

- `draft_letters.signatureMode` (text: `typed` | `drawn` | null), `draft_letters.signatureAssetId`.
- `signatureFlowMode` enum reduced to `{ none, visual }`.
- The drawn-signature rendering path: `backend/src/modules/files/file.service.ts`, `backend/src/modules/rendering/drawn-signature.ts`, the `/files/:id/preview|inline|download` routes, and the signature image upload (`kind: "signature"`) in `file.routes.ts`.
- `fileAssets` table and its `kind = "signature"` rows.

**REMOVE — everything QES / provider-backed:**

- Flow mode value `swisssign_ses`; assurance level enum `signatureAssuranceLevel` entirely (only `visual` would remain → meaningless).
- DB tables `signature_sessions`, `signature_events` and enums `signature_provider`, `signature_eligibility_status`, `signature_session_status`.
- `order_fulfillment_status` QES-only values: `signature_selected`, `signature_eligibility_confirmed`, `identity_stepup_started`, `signature_session_created`, `signature_in_progress`, `signature_completed`, `signed_document_attached`. (`signature_selected` is only reachable via the removed non-visual branch — see `fulfillment.service.ts:82-87`.)
- All SwissSign providers, SwissID OIDC, signature-session/eligibility services, the signing routes, and the 5 frontend signature pages.

**Baseline before starting (record actual numbers):** typecheck clean, lint clean, `npm test` = 2043 passed / 8 skipped, `node ci/check-file-sizes.mjs` passes.

---

## Task 0: Branch + baseline

**Files:** none (git only)

- [ ] **Step 1: Create a working branch**

```bash
cd /home/sam/dev/episto
git checkout -b remove-qes-swisssign-signing
```

- [ ] **Step 2: Capture the green baseline**

```bash
npm run typecheck && npm run lint && npm test && node ci/check-file-sizes.mjs
```

Expected: typecheck/lint clean; `2043 passed | 8 skipped`; `File size guard passed.`

---

## Task 1: Frontend — delete QES signature pages and hooks

**Files:**

- Delete: `frontend/src/app/[locale]/draft/[draftId]/signature/eligibility/page.tsx`
- Delete: `frontend/src/app/[locale]/draft/[draftId]/signature/pending/page.tsx`
- Delete: `frontend/src/app/[locale]/draft/[draftId]/signature/return/page.tsx`
- Delete: `frontend/src/app/[locale]/draft/[draftId]/signature/resume/page.tsx`
- Delete: `frontend/src/app/[locale]/draft/[draftId]/signature/mock/[providerSessionId]/page.tsx`
- Delete (whole `signature/` segment dir once empty): `frontend/src/app/[locale]/draft/[draftId]/signature/`
- Delete: `frontend/src/hooks/use-signature-fulfillment.ts`
- Inspect then likely delete: `frontend/src/app/[locale]/signature-requirements/page.tsx` and `frontend/src/lib/signature-choice.ts` — **read each first**; keep only if it serves typed/drawn copy with no QES/eligibility logic. If it mixes both, strip the QES parts rather than deleting.

- [ ] **Step 1: Delete the 5 QES route pages and the empty `signature/` dir**

```bash
git rm "frontend/src/app/[locale]/draft/[draftId]/signature/eligibility/page.tsx" \
       "frontend/src/app/[locale]/draft/[draftId]/signature/pending/page.tsx" \
       "frontend/src/app/[locale]/draft/[draftId]/signature/return/page.tsx" \
       "frontend/src/app/[locale]/draft/[draftId]/signature/resume/page.tsx" \
       "frontend/src/app/[locale]/draft/[draftId]/signature/mock/[providerSessionId]/page.tsx"
```

- [ ] **Step 2: Delete the QES fulfillment hook**

```bash
git rm frontend/src/hooks/use-signature-fulfillment.ts
```

- [ ] **Step 3: Remove the re-exports from `use-api.ts`**

In `frontend/src/hooks/use-api.ts`, delete the import/re-export block (currently lines ~33-36):

```ts
  useSignatureEligibility,
  useCreateSignatureSession,
  useTriggerMockSignatureOutcome,
} from "./use-signature-fulfillment";
```

and any other identifiers that file re-exported from `use-signature-fulfillment`.

- [ ] **Step 4: Resolve the remaining frontend references**

```bash
grep -rn "use-signature-fulfillment\|useSignatureEligibility\|useCreateSignatureSession\|useTriggerMockSignatureOutcome\|signatureRequired\|signatureSession\|eligibility\|swisssign\|signatureAssuranceLevel\|/signature/" frontend/src --include='*.ts' --include='*.tsx'
```

For each hit in `frontend/src/components/product/review/ReviewPageReady.tsx`, `frontend/src/components/product/draft-flow/step-validation.ts`, and `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`: remove the QES branch so the component behaves as if `signatureFlowMode` is always `visual`/`none` (no eligibility gate, no signature-session polling, no redirect to `/signature/*`). Keep the typed/drawn selection UI untouched.

- [ ] **Step 5: Typecheck frontend**

```bash
npm run typecheck -w frontend
```

Expected: clean. Fix any dangling references before continuing.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Remove QES signature pages and hooks from frontend"
```

---

## Task 2: Backend — delete the signing module internals and routes

**Files:**

- Delete: `backend/src/modules/signing/providers/swisssign.provider.ts`
- Delete: `backend/src/modules/signing/providers/swisssign.mock-provider.ts`
- Delete: `backend/src/modules/signing/providers/swisssign.placeholder-provider.ts`
- Delete: `backend/src/modules/signing/providers/swisssign.types.ts`
- Delete: `backend/src/modules/signing/provider-factory.ts`
- Delete: `backend/src/modules/signing/swissid/oidc.service.ts` (and the `swissid/` dir)
- Delete: `backend/src/modules/signing/signature-session.service.ts`
- Delete: `backend/src/modules/signing/signature-availability.ts`
- Delete: `backend/src/modules/signing/signature-flow.ts`
- Delete: `backend/src/modules/signing/signed-document.service.ts`
- Delete: `backend/src/modules/signing/fulfillment-response.service.ts` **only if** nothing outside QES consumes it — it builds `DraftFulfillmentStatusResponse` which the order-status path uses. **Read its consumers first** (`grep -rn "buildDraftFulfillmentResponse\|resolveDraftFulfillmentNextAction"`). If consumed, keep the file but collapse it to the visual/none path (Task 2 Step 3).
- Delete: `backend/src/modules/signing/adapters/signing.adapter.ts` (and `adapters/` dir) **after** confirming no non-QES consumer via grep.
- Modify: `backend/src/modules/signing/signature.routes.ts` — delete all QES routes; keep none unless a route serves visual-only needs (it does not — visual upload lives in `file.routes.ts`). Expect to delete this file and drop its registration.
- Modify: `backend/src/modules/signing/fulfillment.service.ts` — keep, but collapse to visual/none (see Step 4).
- Modify: `backend/src/modules/signing/index.ts` — remove QES exports; keep only what survives.
- Modify: `backend/src/app.ts:30,246` — remove `signingRoutes` import and `app.register(signingRoutes, ...)`.

- [ ] **Step 1: Map consumers of the signing module's surviving exports**

```bash
grep -rn "from \"../signing\|from \"./signing\|modules/signing\|getSwissSignProvider\|signingRoutes\|getSigningAdapter\|buildDraftFulfillmentResponse\|resolveDraftFulfillmentNextAction\|getLatestSignatureSession\|syncDraftFulfillmentFromSignatureSessionStatus\|assertSignatureFlowSupported\|isSwissSignFlowMode\|requiresSignedDocument" backend/src --include='*.ts'
```

Record which symbols are imported outside the signing module. `buildDraftFulfillmentResponse` (order status), `syncDraftFulfillmentFromPaymentState`, and `setInitialDraftFulfillmentStatus` are the likely survivors. Everything else is QES-internal and gets deleted.

- [ ] **Step 2: Remove `signingRoutes` from the app**

In `backend/src/app.ts`, delete the import at line ~30 (`import { signingRoutes } from "./modules/signing/index.js";`) and the registration at line ~246 (`await app.register(signingRoutes, { prefix: "/api/v1" });`).

- [ ] **Step 3: Collapse `fulfillment-response.service.ts` to visual/none**

If kept (Task 2 Files note), rewrite so it no longer imports `getLatestSignatureSession`, `SignatureSessionRow`, or `isSwissSignFlowMode`. Concretely:

- Delete `getEligibility()` and remove `signatureSession` from the `Promise.all` and from the returned object.
- In `resolveDraftFulfillmentNextAction`, hard-set `const signatureRequired = false;` and delete the entire `if (signatureRequired) { ... }` / signatureSession block (lines ~105-148), leaving only the `!signatureRequired` path.
- Remove `signatureRequired`, `eligibility`, and `signatureSession` from the returned `fulfillment` object (these contract fields are removed in Task 3).

- [ ] **Step 4: Collapse `fulfillment.service.ts` to visual/none**

In `backend/src/modules/signing/fulfillment.service.ts`:

- Delete `getFulfillmentTargetForSignatureSessionStatus` and `syncDraftFulfillmentFromSignatureSessionStatus` entirely.
- In `setInitialDraftFulfillmentStatus`, delete the `signature_selected` branch so it always transitions to `signature_not_required` (the `signatureFlowMode` param can stay for signature-of-call compatibility or be removed if unused — check callers).
- In `syncDraftFulfillmentFromPaymentState`, remove the `isSwissSignFlowMode` import and the swisssign branches: `authorized` → no-op for QES (delete), and `captured` always → `payment_captured` (delete the `else if signatureSessionStatus` arm and the `signatureSessionStatus` input field).
- Remove the now-unused `SignatureSessionStatusValue` import.

- [ ] **Step 5: Delete the QES provider/OIDC/session/eligibility/adapter files**

```bash
git rm -r backend/src/modules/signing/providers \
          backend/src/modules/signing/swissid \
          backend/src/modules/signing/signature-session.service.ts \
          backend/src/modules/signing/signature-availability.ts \
          backend/src/modules/signing/signature-flow.ts \
          backend/src/modules/signing/signed-document.service.ts \
          backend/src/modules/signing/provider-factory.ts \
          backend/src/modules/signing/signature.routes.ts
# adapters/ and fulfillment-response.service.ts: only after Step 1 confirms no surviving consumer
```

- [ ] **Step 6: Rewrite `signing/index.ts` to export only survivors**

Keep exports only for what remains (e.g. `fulfillment.service.ts` functions and, if kept, `fulfillment-response.service.ts`). Remove all provider/adapter/route exports.

- [ ] **Step 7: Prune the cross-cutting backend consumers**

For each file below, remove the QES branch and any import of deleted symbols, leaving visual/none behavior:

- `backend/src/modules/dispatch/dispatch-eligibility.ts`
- `backend/src/modules/dispatch/dispatch-package.service.ts`
- `backend/src/workers/render-pdf.worker.ts` (keep drawn-signature rendering; remove `requiresSignedDocument`/signed-document fetch)
- `backend/src/modules/drafting/draft.routes.ts` (remove `assertSignatureFlowSupported` call + `signatureAssuranceLevel` handling)
- `backend/src/modules/payments/payment-checkout.routes.ts`, `payment-status.routes.ts`, `payment-route-helpers.ts`, `payment-webhook.routes.ts` (remove `signatureFlowMode`/signatureSession lookups; payment no longer waits on signing)
- `backend/src/modules/files/file.service.ts` (remove only signature-SESSION references; keep `kind="signature"` asset logic)
- `backend/src/modules/rendering/pdf-access.ts`
- `backend/src/modules/admin/admin-case.routes.ts` (remove signature-session columns from the admin case view)

Use this to find every remaining reference:

```bash
grep -rn "signatureSession\|signature_session\|signatureAssuranceLevel\|swisssign\|swissid\|isSwissSignFlowMode\|eligibility\|SignatureProvider\|signatureEvents\|oidc" backend/src --include='*.ts' | grep -v "kind === \"signature\"\|drawn-signature"
```

- [ ] **Step 8: Typecheck backend**

```bash
npm run typecheck -w backend
```

Expected: clean. Resolve all dangling imports/types before continuing. (Shared still has the old enum values at this point, which is fine.)

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "Remove QES/SwissSign signing module and prune backend consumers"
```

---

## Task 3: Shared — simplify contracts, schemas, enums, state machines

**Files:**

- Modify: `shared/src/enums.ts`
- Modify: `shared/src/schemas/index.ts`
- Modify: `shared/src/contracts/index.ts`
- Modify: `shared/src/state-machines.ts`

- [ ] **Step 1: Trim enums in `shared/src/enums.ts`**

- `SignatureFlowMode`: delete the `swisssign_ses` line → `{ none, visual }`.
- Delete `SignatureAssuranceLevel`, `SignatureAssuranceLevelValue`, `SigningProvider`, `SigningProviderValue`, `IdentVerificationMethod(+Value)`, `SigningState(+Value)`, `SignatureJurisdiction(+Value)`, `SignatureEligibilityStatus(+Value)`, `SignatureEligibilityReason(+Value)`, `SignatureSessionStatus(+Value)` — **after** confirming no surviving non-QES consumer:

```bash
grep -rn "SignatureAssuranceLevel\|SigningProvider\|IdentVerificationMethod\|SigningState\b\|SignatureJurisdiction\|SignatureEligibility\|SignatureSessionStatus" backend/src frontend/src shared/src --include='*.ts' --include='*.tsx'
```

- `OrderFulfillmentStatus`: delete the 7 QES values listed in the boundary section. Keep `draft_created, draft_completed, preview_ready, signature_not_required, payment_authorized, dispatch_submitted, payment_captured, dispatch_confirmed, completed, failed, expired`.

- [ ] **Step 2: Trim `shared/src/schemas/index.ts`**

- Delete `SignatureAssuranceLevelSchema`, `SignatureEligibilitySchema`, `SignatureSessionSchema`, and any schema built only from removed enums.
- Keep `SignatureFlowModeSchema` (now `none|visual`) and `OrderFulfillmentStatusSchema` (regenerated from the trimmed enum).
- Remove `signatureAssuranceLevel` fields (lines ~182, 235) and the removed-enum imports (lines ~9-10).

- [ ] **Step 3: Trim `shared/src/contracts/index.ts`**

- Remove imports `SignatureAssuranceLevelSchema, SignatureEligibilitySchema, SignatureSessionSchema` (lines ~6-9).
- In `DraftPatch` (lines ~36-37): delete `signatureAssuranceLevel`. Keep `signatureFlowMode`, `signatureMode` (`typed|drawn`), `signatureAssetId`.
- In `DraftFulfillmentStatusResponseSchema` (lines ~238-268): delete `signatureRequired`, `eligibility`, `signatureSession`. In the `nextAction` enum, delete `eligibility_gate`, `resume_signature`, `await_signature_callback`, `retry_signature` (keep `continue_editing`, `review`, `checkout`, `await_dispatch`, `view_confirmation` — verify against the trimmed `fulfillment-response.service.ts` so the two match exactly).

- [ ] **Step 4: Trim `shared/src/state-machines.ts`**

- Delete the `SigningState` transition map (lines ~173-231), the `SignatureSessionStatus` transition map + `canTransitionSignatureSession` (lines ~233-end of that block), and their imports.
- In the fulfillment transition map, delete every entry whose key or target is one of the 7 removed `OrderFulfillmentStatus` values, and re-point transitions: `preview_ready → signature_not_required → payment_authorized → payment_captured → dispatch_submitted → dispatch_confirmed → completed` (plus `failed`/`expired` terminals). Confirm `setInitialDraftFulfillmentStatus` and `syncDraftFulfillmentFromPaymentState` only ever request transitions that exist in the trimmed map.

- [ ] **Step 5: Build shared + full typecheck**

```bash
npm run build -w shared && npm run typecheck
```

Expected: all three workspaces clean. Fix mismatches (most likely in the trimmed `nextAction` union or fulfillment transitions).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Simplify shared signature contracts, enums, and state machines to visual-only"
```

---

## Task 4: Database — drop QES tables/columns/enums via migration

**Files:**

- Modify: `backend/src/db/schema/drafting.ts` (remove `signatureAssuranceLevelEnum`, the `signatureAssuranceLevel` column, `swisssign_ses` from `signatureFlowModeEnum`, the 7 QES values from `orderFulfillmentStatusEnum`)
- Delete: `backend/src/db/schema/signatures.ts`
- Modify: `backend/src/db/schema/relations.ts` and `backend/src/db/schema/index.ts` (remove signature_sessions/events exports + relations)
- Create: `backend/drizzle/0013_remove_qes_swisssign_signing.sql`
- Create: `backend/drizzle/0013_remove_qes_swisssign_signing.down.sql`
- Modify: `backend/drizzle/meta/_journal.json` (append idx 13) and add the matching `meta/0013_snapshot.json`

Use `backend/drizzle/0011_legacy_signature_cleanup.sql` as the structural template for hand-written signature migrations.

- [ ] **Step 1: Update the Drizzle schema TS**

Apply the schema edits above. Postgres cannot drop individual enum values, so the migration recreates the two surviving enums; reflect the final value sets in TS exactly.

- [ ] **Step 2: Write the up migration `0013_remove_qes_swisssign_signing.sql`**

```sql
-- Drop QES / SwissSign provider-backed signing.
DROP TABLE IF EXISTS "signature_events";
DROP TABLE IF EXISTS "signature_sessions";

DROP TYPE IF EXISTS "signature_session_status";
DROP TYPE IF EXISTS "signature_eligibility_status";
DROP TYPE IF EXISTS "signature_provider";

-- draft_letters.signature_assurance_level is QES-only; remove column then type.
ALTER TABLE "draft_letters" DROP COLUMN IF EXISTS "signature_assurance_level";
DROP TYPE IF EXISTS "signature_assurance_level";

-- Recreate signature_flow_mode without swisssign_ses.
ALTER TABLE "draft_letters" ALTER COLUMN "signature_flow_mode" DROP DEFAULT;
ALTER TYPE "signature_flow_mode" RENAME TO "signature_flow_mode_old";
CREATE TYPE "signature_flow_mode" AS ENUM ('none', 'visual');
ALTER TABLE "draft_letters"
  ALTER COLUMN "signature_flow_mode" TYPE "signature_flow_mode"
  USING (CASE WHEN "signature_flow_mode"::text = 'swisssign_ses' THEN 'visual' ELSE "signature_flow_mode"::text END::"signature_flow_mode");
ALTER TABLE "draft_letters" ALTER COLUMN "signature_flow_mode" SET DEFAULT 'visual';
DROP TYPE "signature_flow_mode_old";

-- Recreate order_fulfillment_status without the 7 QES states (map them onto safe survivors).
ALTER TABLE "draft_letters" ALTER COLUMN "fulfillment_status" DROP DEFAULT;
ALTER TYPE "order_fulfillment_status" RENAME TO "order_fulfillment_status_old";
CREATE TYPE "order_fulfillment_status" AS ENUM (
  'draft_created','draft_completed','preview_ready','signature_not_required',
  'payment_authorized','dispatch_submitted','payment_captured','dispatch_confirmed',
  'completed','failed','expired'
);
ALTER TABLE "draft_letters"
  ALTER COLUMN "fulfillment_status" TYPE "order_fulfillment_status"
  USING (CASE
    WHEN "fulfillment_status"::text IN ('signature_selected','signature_eligibility_confirmed') THEN 'signature_not_required'
    WHEN "fulfillment_status"::text IN ('identity_stepup_started','signature_session_created','signature_in_progress','signature_completed','signed_document_attached') THEN 'payment_authorized'
    ELSE "fulfillment_status"::text
  END::"order_fulfillment_status");
ALTER TABLE "draft_letters" ALTER COLUMN "fulfillment_status" SET DEFAULT 'draft_created';
DROP TYPE "order_fulfillment_status_old";
```

- [ ] **Step 3: Write the down migration `0013_...down.sql`**

Recreate the dropped enum values and the `signature_assurance_level` column (default `'visual'`), and recreate the `signature_sessions` / `signature_events` tables and their enums by copying the relevant `CREATE` statements from `0008_swisssign_signature_readiness.sql` and `0009_qes_waitlist_and_step_events.sql`. The down migration only needs to restore schema shape, not data.

- [ ] **Step 4: Append the journal entry**

Add to `backend/drizzle/meta/_journal.json` entries array:

```json
{
  "idx": 13,
  "version": "7",
  "when": 1781000000000,
  "tag": "0013_remove_qes_swisssign_signing",
  "breakpoints": true
}
```

Generate the matching `meta/0013_snapshot.json` (run `npm run db:generate` and keep only the snapshot it produces if it matches; otherwise copy `meta/0012_snapshot.json` and hand-edit to the new schema). The snapshot must reflect the trimmed enums and dropped tables.

- [ ] **Step 5: Verify migration applies and rolls back on a scratch DB**

```bash
# Use the project's migration tooling against a disposable DB, then the documented rollback verification.
npm run build -w backend && npm run db:migrate
```

Expected: migrations run clean through 0013. Then verify the `.down.sql` reverses 0013 using the repo's rollback verification step (see `docs/07-operations/dev-workflow.md`).

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add -A && git commit -m "Drop QES signature tables, columns, and enum values (migration 0013)"
```

---

## Task 5: Env + config cleanup

**Files:**

- Modify: `backend/src/shared/config/env.ts`

- [ ] **Step 1: Remove QES env vars and their refinements**

Delete these schema keys and any `.refine()` that references them: `SIGNATURE_PROVIDER_MODE`, `SIGNATURE_CALLBACK_SECRET`, `SIGNATURE_PENDING_TTL_MINUTES`, all `SWISSID_OIDC_*`, `SWISSSIGN_API_BASE_URL`, `SWISSSIGN_API_KEY` (lines ~46-66 and the swisssign refine at ~373-389).

- [ ] **Step 2: Sweep for stragglers**

```bash
grep -rn "SIGNATURE_PROVIDER_MODE\|SIGNATURE_CALLBACK_SECRET\|SWISSID_OIDC\|SWISSSIGN_API\|SIGNATURE_PENDING_TTL" backend frontend services --include='*.ts' --include='*.mjs' --include='*.yml' --include='*.example'
```

Remove hits in `.env.example`, `docker-compose*.yml`, and any config docs.

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck -w backend
git add -A && git commit -m "Remove QES/SwissSign environment configuration"
```

---

## Task 6: Tests — update to the visual-only world

**Files:**

- Delete: `backend/tests/signature-workflow-variants.test.ts`, `backend/tests/signature-callback-idempotency.test.ts` (QES-only; confirm contents before deleting).
- Modify: `backend/tests/fulfillment-next-action.test.ts`, `backend/tests/render-pdf.worker.test.ts`, `backend/tests/dispatch-eligibility.test.ts`, `backend/tests/payment-checkout.routes.test.ts`, `backend/tests/admin-actions.test.ts` — remove QES cases, keep visual/none assertions.
- Search frontend tests too:

```bash
grep -rln "swisssign\|signatureSession\|eligibility\|signatureAssuranceLevel\|/signature/\|signatureRequired" frontend/tests backend/tests shared/tests
```

- [ ] **Step 1: Delete the QES-only test files**

```bash
git rm backend/tests/signature-workflow-variants.test.ts backend/tests/signature-callback-idempotency.test.ts
```

- [ ] **Step 2: Update the mixed test files**

Remove QES setup/assertions; keep and, where a removed case proved real behavior, replace with the visual-equivalent assertion (e.g. a `visual` draft goes straight to `signature_not_required` → `payment_authorized`). Do not weaken unrelated assertions.

- [ ] **Step 3: Run the full suite**

```bash
npm test
```

Expected: all pass, with the count reduced by the deleted QES tests. No test left skipped to dodge a failure.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Update tests for visual-only signature model"
```

---

## Task 7: Docs cleanup

**Files (delete):**

- `docs/04-product/qualified-signatures.md`
- `docs/05-architecture/swisssign-signature-architecture.md`
- `docs/05-architecture/2026-04-20-swisssign-readiness-audit.md`
- `docs/05-architecture/2026-04-21-swisssign-handoff.md`
- `docs/superpowers/specs/2026-04-19-qualified-signature-design.md`
- `docs/superpowers/plans/2026-04-19-qualified-signature-implementation.md`
- `docs/superpowers/plans/2026-04-20-swisssign-readiness.md`
- `docs/superpowers/plans/2026-05-01-preview-qes-audience.md`

**Files (edit references):**

- `docs/04-product/signatures-and-attachments.md` (drop the QES section + the pointer to `qualified-signatures.md`; keep typed/drawn)
- `docs/08-guardrails/open-decisions.md` (remove the QES-provider decision)
- `docs/index.md`, `README.md`, `TASKS.md` (remove links/lines referencing QES / SwissSign / qualified signatures)

- [ ] **Step 1: Delete the QES docs**

```bash
git rm docs/04-product/qualified-signatures.md \
       docs/05-architecture/swisssign-signature-architecture.md \
       docs/05-architecture/2026-04-20-swisssign-readiness-audit.md \
       docs/05-architecture/2026-04-21-swisssign-handoff.md \
       docs/superpowers/specs/2026-04-19-qualified-signature-design.md \
       docs/superpowers/plans/2026-04-19-qualified-signature-implementation.md \
       docs/superpowers/plans/2026-04-20-swisssign-readiness.md \
       docs/superpowers/plans/2026-05-01-preview-qes-audience.md
```

- [ ] **Step 2: Fix dangling doc references**

```bash
grep -rln "qualified-signatures\|swisssign\|QES\|qualified electronic\|signature session\|swissid" docs README.md TASKS.md
```

Edit each remaining hit so docs describe only the typed/drawn visual model.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "Remove QES/SwissSign documentation"
```

---

## Task 8: Final verification gate

- [ ] **Step 1: Run every gate**

```bash
npm run typecheck && npm run lint && npm test && node ci/check-file-sizes.mjs
```

Expected: typecheck clean; lint clean (`--max-warnings 0`); all tests pass (count = baseline minus deleted QES tests, zero new skips); `File size guard passed.`

- [ ] **Step 2: Confirm no QES residue**

```bash
grep -rni "swisssign\|swissid\|qes\|qualified electronic\|swisssign_ses\|signature_session\|signatureAssuranceLevel\|provider-backed signature" \
  backend/src frontend/src shared/src services backend/tests frontend/tests --include='*.ts' --include='*.tsx' --include='*.mjs'
```

Expected: no output (anything left must be an intentional, documented survivor — justify it).

- [ ] **Step 3: Confirm visual signatures still work end to end**

Manually or via existing tests, verify: upload drawn signature (`kind="signature"`) → preview/inline/download routes → PDF renders the drawn signature → checkout → dispatch. None of these touch the removed code.

- [ ] **Step 4: Final commit / branch ready for review**

```bash
git add -A && git commit -m "Finalize QES/SwissSign removal" --allow-empty
```

---

## Self-Review notes

- **Contract/enum consistency:** the `nextAction` union in `contracts/index.ts` (Task 3 Step 3) MUST equal the set returned by the trimmed `resolveDraftFulfillmentNextAction` (Task 2 Step 3). The fulfillment transition map (Task 3 Step 4) MUST contain every transition requested by `fulfillment.service.ts` (Task 2 Step 4). Verify both pairings explicitly.
- **Enum-drop risk:** removing Postgres enum values requires the recreate dance in Task 4 Step 2 — do not attempt `ALTER TYPE ... DROP VALUE` (unsupported).
- **Keep visual intact:** `signatureMode`, `signatureAssetId`, the drawn-signature rendering, and the `kind="signature"` upload path are explicitly out of scope for removal. If a grep tempts you to delete them, stop.
- **Survivor check before each deletion:** Tasks 2 and 3 each begin with a grep to confirm no non-QES consumer. Never delete a symbol with a live external consumer without first collapsing that consumer.
