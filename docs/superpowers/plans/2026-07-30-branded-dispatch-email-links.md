# Branded Dispatch Email Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Episto status-page links from dispatch emails, use Swiss Post tracking only for registered mail, retain time-limited PDF access, and restore the app’s lowercase Episto logo/wordmark.

**Architecture:** Keep the existing transactional email pipeline and ledger-style layout. Remove status-page data at the context boundary so templates cannot accidentally render it, add an email-safe inline SVG version of the existing shared brand mark, and make the accepted-dispatch renderer select exactly one operational primary action based on delivery type.

**Tech Stack:** TypeScript, Vitest, inline HTML email templates, shared brand constants, Resend/outbox email pipeline.

---

### Task 1: Lock down email behavior with failing render tests

**Files:**

- Modify: `backend/tests/email-templates.test.ts`
- Modify: `backend/tests/dispatch-notifications.test.ts`
- Modify: `backend/tests/email-outbox.integration.test.ts` only if existing payload assertions require the removed field

- [ ] **Step 1: Add failing assertions**

Add accepted-dispatch cases for standard and registered delivery. Assert that the rendered HTML/text contains the temporary PDF URL for both, contains the Swiss Post URL only for registered mail with a tracking number, and contains neither `/status/` nor `statusUrl`.

Add a branding assertion that rendered HTML contains the lowercase `episto` wordmark and the shared brand-mark SVG geometry, and does not use a generated initial badge or `Episto` wordmark.

- [ ] **Step 2: Run the focused tests and verify they fail for the intended reasons**

Run:

```bash
npx vitest run backend/tests/email-templates.test.ts backend/tests/dispatch-notifications.test.ts
```

Expected: failures show the status URL still renders and the current masthead does not contain the exact shared logo/wordmark.

- [ ] **Step 3: Commit the red tests**

```bash
git add backend/tests/email-templates.test.ts backend/tests/dispatch-notifications.test.ts
git commit -m "test: specify branded dispatch email links"
```

### Task 2: Verify and preserve the no-status-link contract

**Files:**

- Modify: `backend/src/modules/dispatch/dispatch-email-context.ts`
- Modify: `backend/src/workers/email-templates.ts`
- Modify: `backend/src/workers/email-strings.ts`

- [x] **Step 1: Confirm the context boundary has no `statusUrl`**

The current isolated branch already omits the status URL from `buildDispatchEmailContext`, the accepted-dispatch strings, and the renderer. Keep the existing negative assertions and ensure the final integration into the shared workspace removes any divergent older variant.

- [x] **Step 2: Confirm delivery-specific actions**

The renderer already keeps the Swiss Post button only when `deliveryType === "registered"` and a tracking number exists, and keeps the time-limited PDF download link for every accepted dispatch with a download URL. Do not reintroduce an application status URL.

- [x] **Step 3: Run focused tests and verify green**

```bash
npx vitest run backend/tests/email-templates.test.ts backend/tests/dispatch-notifications.test.ts
```

Expected: link-behavior tests pass; no status URL appears in generated output.

- [x] **Step 4: Keep the contract in the branding commit**

```bash
git add backend/src/modules/dispatch/dispatch-email-context.ts backend/src/workers/email-templates.ts backend/src/workers/email-strings.ts
git commit -m "fix: remove customer status links from dispatch email"
```

### Task 3: Restore the exact Episto email masthead

**Files:**

- Modify: `backend/src/shared/brand.ts`
- Modify: `backend/src/workers/email-layout.ts`
- Modify: `backend/src/workers/email-template-helpers.ts`
- Modify: `backend/tests/email-templates.test.ts`

- [ ] **Step 1: Add an email-safe inline brand-mark renderer**

Reuse `BRAND_MARK_VIEW_BOX`, `BRAND_MARK_BASE`, `BRAND_MARK_RING`, `BRAND_MARK_DOT`, and `BRAND_COLOR` from `@episto/shared` to render the same SVG mark used by the app and PDFs. Keep the wordmark literal `episto` so production `APP_DISPLAY_NAME=Episto` cannot change visual branding.

- [ ] **Step 2: Update the layout masthead**

Replace the generated initial badge and configurable capitalized wordmark with the shared SVG mark and lowercase serif `episto` wordmark. Preserve the existing ledger colors, rule, footer, and email-client-safe table/inline styles.

- [ ] **Step 3: Add the branding regression assertion and run tests**

```bash
npx vitest run backend/tests/email-templates.test.ts backend/tests/email-layout.test.ts
```

Expected: the email contains the shared mark geometry and lowercase serif wordmark; all existing layout tests remain green.

- [ ] **Step 4: Commit the branding change**

```bash
git add backend/src/shared/brand.ts backend/src/workers/email-layout.ts backend/src/workers/email-template-helpers.ts backend/tests/email-templates.test.ts
git commit -m "fix: restore branded Episto email masthead"
```

### Task 4: Make dispatch alerts actionable without adding an admin page

**Files:**

- Modify: `frontend/src/app/[locale]/admin/overview/page.tsx`
- Modify: `frontend/src/app/[locale]/admin/dashboard/page.tsx`
- Modify: `frontend/src/app/[locale]/admin/admin-overview-panels.tsx`
- Modify: `frontend/src/app/[locale]/admin/admin-metric-panels.tsx`
- Test: `frontend/tests/admin-dashboard-ux-contract.test.ts`

- [x] **Step 1: Add a failing information-architecture contract**

Require the Overview page’s ambiguous/failed dispatch metrics to link to the existing Dashboard dispatch-case section, and require that section to expose a stable `dispatch-cases` anchor.

- [x] **Step 2: Implement the minimal drill-down**

Add optional links to generic metric cards, link only the two dispatch queue metrics to `${dashboardPath}#dispatch-cases`, and add the anchor to the already existing dashboard case list. Leave Dashboard, Overview, and Funnel as distinct surfaces.

- [x] **Step 3: Verify the contract and frontend typecheck**

```bash
npx vitest run frontend/tests/admin-dashboard-ux-contract.test.ts
npm run typecheck --workspace frontend
```

### Task 5: Full verification and production rollout

**Files:**

- No additional source files; verify the committed changes.

- [ ] **Step 1: Run typechecks, focused tests, and the full suite**

```bash
npm run build --workspace shared
npm run typecheck --workspace backend
npm run typecheck --workspace frontend
npx vitest run backend/tests/email-templates.test.ts backend/tests/dispatch-notifications.test.ts backend/tests/email-layout.test.ts
npm test -- --run
git diff --check
```

Expected: all checks pass; existing non-fatal test warnings may remain, but no new failures are acceptable.

- [ ] **Step 2: Build and deploy production images**

```bash
PROD_HOST=episto.ch ENV_FILE=/home/sam/dev/episto/.env.production SERVICE_ACCOUNT_SOURCE=/home/sam/dev/episto/.google-service-account.json ./scripts/deploy.sh
```

- [ ] **Step 3: Verify production behavior**

Check `/api/readiness`, container health, and the deployed worker/backend logs. Render representative standard and registered accepted-dispatch email payloads against the deployed build or verified source and confirm only the registered case contains `post.ch` tracking.

- [ ] **Step 4: Integrate the verified commits into the shared workspace**

Preserve unrelated dirty user work, cherry-pick only the email commits, rerun typechecks and focused tests in `/home/sam/dev/episto`, and report changed files and checks.
