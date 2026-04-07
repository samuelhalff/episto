# Draft Workspace Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the draft, review, and checkout flow so desktop actions feel deliberate, the first-draft guidance appears at the right moment, quick-attach supports multi-file selection, and the repo finishes on a main-only workflow with documented instructions.

**Architecture:** Keep the work frontend-only and focused on existing shared primitives. Make the CTA sizing, dialog contrast, sticky action dock, and payment-button cleanup in the shared components that already own those responsibilities, then wire the route-specific behavior in `BodyStep`, `IntakeStep`, `review/page.tsx`, and `checkout/page.tsx`. Finish by documenting the new main-only workflow in repo guidance and merging the remaining branch/worktree state back into `main`.

**Tech Stack:** Next.js App Router, TypeScript, next-intl, TanStack Query, Tailwind CSS, Vitest, git

---

## File map

- **Create:** `frontend/tests/thread-action-card.test.ts` — regression test for desktop max-width CTA in thread banners
- **Create:** `frontend/tests/body-step-first-draft-modal.test.ts` — regression test for first-draft-ready timing + one-time dismissal contract
- **Create:** `frontend/tests/intake-quick-attach.test.ts` — regression test for hidden intake file input multi-select behavior
- **Modify:** `frontend/src/components/product/draft-flow/cards.tsx` — apply responsive max-width to `ThreadActionCard` CTA without changing mobile full-width behavior
- **Modify:** `frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx` — strengthen loading badge contrast in both themes
- **Modify:** `frontend/src/components/product/draft-flow/BodyStep.tsx` — retime the one-time body overlay to the first real AI draft and swap in the new copy/dismiss action
- **Modify:** `frontend/src/components/product/draft-flow/IntakeStep.tsx` — make the quick-attach input accept multiple files and upload them sequentially
- **Modify:** `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx` — keep the review action dock visible on desktop and preserve enough bottom padding
- **Modify:** `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx` — give the desktop back action more room in the pre-payment dock
- **Modify:** `frontend/src/components/product/StripePaymentForm.tsx` — remove the final price chip from the payment submit CTA
- **Modify:** `frontend/src/messages/en-CH.json` — add first-draft-ready copy
- **Modify:** `frontend/src/messages/de-CH.json` — add first-draft-ready copy
- **Modify:** `frontend/src/messages/fr-CH.json` — add first-draft-ready copy
- **Modify:** `frontend/src/messages/it-CH.json` — add first-draft-ready copy
- **Modify:** `frontend/tests/body-generation-dialog.test.ts` — update contrast contract expectations
- **Modify:** `frontend/tests/draft-copy.test.ts` — add required locale-key coverage for the new body-step copy
- **Modify:** `frontend/tests/review-page.test.ts` — assert review page opts into desktop sticky dock and keeps padded bottom spacing
- **Modify:** `frontend/tests/flow-action-dock.test.ts` — update review dock expectation from desktop-static to desktop-sticky
- **Modify:** `frontend/tests/checkout-payment-contract.test.ts` — assert Stripe footer drops the price chip and checkout back action no longer uses equal-width compression
- **Modify:** `.github/copilot-instructions.md` — record the main-only, no-worktree, no-branch workflow rule
- **Modify:** `TASKS.md` — add the same workflow rule where repo work guidance already points contributors

---

### Task 1: Tighten thread CTA sizing and body-loading contrast

**Files:**
- Create: `frontend/tests/thread-action-card.test.ts`
- Modify: `frontend/tests/body-generation-dialog.test.ts`
- Modify: `frontend/src/components/product/draft-flow/cards.tsx`
- Modify: `frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/tests/thread-action-card.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cardsSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/cards.tsx"),
  "utf8",
);

describe("thread action card regressions", () => {
  it("keeps the CTA full width on mobile but caps it on desktop", () => {
    expect(cardsSource).toContain('<div className="w-full sm:max-w-sm">');
    expect(cardsSource).toContain("<PrimaryButton onClick={onAction} disabled={disabled}>");
  });
});
```

```ts
// frontend/tests/body-generation-dialog.test.ts
it("loading UI uses one drafting indicator with stronger dual-theme contrast", () => {
  expect(bodyGenerationDialogSource).toContain("loadingLabel");
  expect(bodyGenerationDialogSource).toContain(
    'bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-300/20 dark:text-amber-50 dark:ring-amber-200/30',
  );
  expect(bodyGenerationDialogSource).toContain("dark:bg-amber-200/90");
  expect(bodyGenerationDialogSource).not.toContain(
    "dark:bg-amber-400/22 dark:text-amber-100 dark:ring-amber-300/25",
  );
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- frontend/tests/thread-action-card.test.ts frontend/tests/body-generation-dialog.test.ts`

Expected: FAIL because `ThreadActionCard` still renders a full-width desktop CTA and the dialog still uses the older lower-contrast amber treatment.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// frontend/src/components/product/draft-flow/cards.tsx
export function ThreadActionCard({
  title,
  description,
  actionLabel,
  onAction,
  disabled = false,
  isCompactViewport = false,
}: ThreadActionCardProps) {
  return (
    <Card
      isCompactViewport={isCompactViewport}
      density="thin"
      className="space-y-3 bg-[var(--app-surface)]"
    >
      {title ? <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p> : null}
      {description ? (
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</p>
      ) : null}
      <div className="w-full sm:max-w-sm">
        <PrimaryButton onClick={onAction} disabled={disabled}>
          {actionLabel}
        </PrimaryButton>
      </div>
    </Card>
  );
}
```

```tsx
// frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx
<div
  className={`inline-flex h-14 w-14 items-center justify-center rounded-3xl ${
    isLoading
      ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-300/20 dark:text-amber-50 dark:ring-amber-200/30"
      : "bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/14 dark:text-red-200 dark:ring-red-400/18"
  }`}
>
  {isLoading ? <Sparkles className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
</div>

<div role="status" className="mt-7 w-full rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-4">
  <div className="flex items-center justify-center gap-3">
    <span className="text-sm font-medium text-amber-800 dark:text-amber-50">{loadingLabel}</span>
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 [animation-delay:-0.2s] dark:bg-amber-200/90" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 [animation-delay:-0.1s] dark:bg-amber-200/90" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 dark:bg-amber-200/90" />
    </div>
  </div>
</div>
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- frontend/tests/thread-action-card.test.ts frontend/tests/body-generation-dialog.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/thread-action-card.test.ts frontend/tests/body-generation-dialog.test.ts frontend/src/components/product/draft-flow/cards.tsx frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx
git commit -m "fix(frontend): polish thread actions and drafting contrast"
```

---

### Task 2: Show the first-draft-ready modal exactly once

**Files:**
- Create: `frontend/tests/body-step-first-draft-modal.test.ts`
- Modify: `frontend/tests/draft-copy.test.ts`
- Modify: `frontend/src/components/product/draft-flow/BodyStep.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/tests/body-step-first-draft-modal.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);

describe("body step first draft ready modal", () => {
  it("shows the one-time overlay only after the first AI draft exists", () => {
    expect(bodyStepSource).toContain(
      'const BODY_STEP_FIRST_DRAFT_READY_STORAGE_KEY = "swiss-mail.body-step-first-draft-ready-dismissed.v1";',
    );
    expect(bodyStepSource).toContain("const firstDraftMessageId = getFirstDraftMessageId");
    expect(bodyStepSource).toContain('t("firstDraftReadyTitle")');
    expect(bodyStepSource).toContain('t("firstDraftReadyBody")');
    expect(bodyStepSource).toContain('t("firstDraftReadyDismiss")');
  });
});
```

```ts
// frontend/tests/draft-copy.test.ts
const REQUIRED_DRAFT_KEYS = [
  "phaseProgress",
  "continueToRecipient",
  "continueToContent",
  "continueToAttachments",
  "continueToLogistics",
  "continueToReview",
  "backToIntake",
  "backToSender",
  "backToRecipient",
  "backToContent",
  "backToAttachments",
  "backToSubject",
  "firstDraftReadyTitle",
  "firstDraftReadyBody",
  "firstDraftReadyDismiss",
] as const;
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- frontend/tests/body-step-first-draft-modal.test.ts frontend/tests/draft-copy.test.ts`

Expected: FAIL because `BodyStep` still uses the old step-entry coachmark timing and the new locale keys do not exist.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// frontend/src/components/product/draft-flow/BodyStep.tsx
const BODY_STEP_FIRST_DRAFT_READY_STORAGE_KEY =
  "swiss-mail.body-step-first-draft-ready-dismissed.v1";

const [showFirstDraftReadyDialog, setShowFirstDraftReadyDialog] = useState(false);
const hasShownFirstDraftReadyRef = useRef(false);

useEffect(() => {
  const firstDraftMessageId = getFirstDraftMessageId(draft.data?.metadata);
  if (!firstDraftMessageId || !bodyText.trim()) return;
  if (shouldShowBodyGenerationDialog) return;
  if (hasShownFirstDraftReadyRef.current) return;

  try {
    if (window.localStorage.getItem(BODY_STEP_FIRST_DRAFT_READY_STORAGE_KEY) === "dismissed") {
      return;
    }
  } catch {
    // Keep the one-time behavior in memory even if storage is unavailable.
  }

  hasShownFirstDraftReadyRef.current = true;
  setShowFirstDraftReadyDialog(true);
}, [bodyText, draft.data?.metadata, shouldShowBodyGenerationDialog]);

function dismissFirstDraftReadyDialog() {
  setShowFirstDraftReadyDialog(false);
  try {
    window.localStorage.setItem(BODY_STEP_FIRST_DRAFT_READY_STORAGE_KEY, "dismissed");
  } catch {
    // Dismiss for the current render session.
  }
}
```

```tsx
// frontend/src/components/product/draft-flow/BodyStep.tsx
{showFirstDraftReadyDialog ? (
  <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/35 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-8 sm:items-center sm:pb-8">
    <div className="app-panel w-full max-w-md rounded-4xl p-5 shadow-2xl">
      <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {t("firstDraftReadyTitle")}
      </h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {t("firstDraftReadyBody")}
      </p>
      <div className="mt-5 flex justify-end">
        <SecondaryButton
          onClick={dismissFirstDraftReadyDialog}
          fullWidth={false}
          leadingVisual="none"
        >
          {t("firstDraftReadyDismiss")}
        </SecondaryButton>
      </div>
    </div>
  </div>
) : null}
```

```json
// frontend/src/messages/en-CH.json
"firstDraftReadyTitle": "Your first draft is ready",
"firstDraftReadyBody": "Check the suggested draft and make any changes you want — manually or with AI.",
"firstDraftReadyDismiss": "Dismiss"
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- frontend/tests/body-step-first-draft-modal.test.ts frontend/tests/draft-copy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/body-step-first-draft-modal.test.ts frontend/tests/draft-copy.test.ts frontend/src/components/product/draft-flow/BodyStep.tsx frontend/src/messages/en-CH.json frontend/src/messages/de-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json
git commit -m "feat(frontend): add first draft ready guidance"
```

---

### Task 3: Fix intake quick-attach multi-file selection

**Files:**
- Create: `frontend/tests/intake-quick-attach.test.ts`
- Modify: `frontend/src/components/product/draft-flow/IntakeStep.tsx`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/intake-quick-attach.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const intakeStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/IntakeStep.tsx"),
  "utf8",
);

describe("intake quick attach regressions", () => {
  it("allows selecting multiple files from the hidden intake input", () => {
    expect(intakeStepSource).toContain("type=\"file\"");
    expect(intakeStepSource).toContain("multiple");
    expect(intakeStepSource).toContain("Array.from(event.target.files ?? [])");
    expect(intakeStepSource).toContain('await files.uploadFile(file, "attachment")');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- frontend/tests/intake-quick-attach.test.ts`

Expected: FAIL because the input currently uploads only `event.target.files?.[0]` and does not declare `multiple`.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// frontend/src/components/product/draft-flow/IntakeStep.tsx
<input
  ref={attachmentInputRef}
  type="file"
  accept=".pdf,.png,.jpg,.jpeg"
  multiple
  className="hidden"
  onChange={async (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    for (const file of selectedFiles) {
      await files.uploadFile(file, "attachment");
    }

    event.target.value = "";
  }}
/>
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- frontend/tests/intake-quick-attach.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/intake-quick-attach.test.ts frontend/src/components/product/draft-flow/IntakeStep.tsx
git commit -m "fix(frontend): allow multi-file intake attachments"
```

---

### Task 4: Keep the review dock visible on desktop and preserve bottom spacing

**Files:**
- Modify: `frontend/tests/review-page.test.ts`
- Modify: `frontend/tests/flow-action-dock.test.ts`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/tests/review-page.test.ts
it("keeps the review footer visible on desktop with extra bottom spacing for the content", () => {
  expect(reviewPageSource).toContain("lg:pb-[calc(12rem+env(safe-area-inset-bottom))]");
  expect(reviewPageSource).toContain("<FlowActionDock");
  expect(reviewPageSource).toContain("desktopSticky");
});
```

```ts
// frontend/tests/flow-action-dock.test.ts
it("review page now opts into desktopSticky so the desktop CTA stays visible", () => {
  const src = fs.readFileSync(
    path.join(srcDir, "app/[locale]/draft/[draftId]/review/page.tsx"),
    "utf-8",
  );
  expect(src).toContain("desktopSticky");
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- frontend/tests/review-page.test.ts frontend/tests/flow-action-dock.test.ts`

Expected: FAIL because the review page is still desktop-static and still uses the smaller desktop bottom padding.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// frontend/src/app/[locale]/draft/[draftId]/review/page.tsx
<main
  id="main-content"
  className="mx-auto max-w-7xl space-y-8 px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:pb-[calc(12rem+env(safe-area-inset-bottom))]"
>
```

```tsx
// frontend/src/app/[locale]/draft/[draftId]/review/page.tsx
<FlowActionDock
  desktopSticky
  secondaryAction={...}
  primaryAction={...}
/>
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- frontend/tests/review-page.test.ts frontend/tests/flow-action-dock.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/review-page.test.ts frontend/tests/flow-action-dock.test.ts frontend/src/app/[locale]/draft/[draftId]/review/page.tsx
git commit -m "fix(frontend): keep review actions visible on desktop"
```

---

### Task 5: Clean up checkout action layout and final payment semantics

**Files:**
- Modify: `frontend/tests/checkout-payment-contract.test.ts`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- Modify: `frontend/src/components/product/StripePaymentForm.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/tests/checkout-payment-contract.test.ts
it("gives the desktop back action room instead of forcing equal-width compression", () => {
  const backActionBlock = checkoutPageSource.slice(
    checkoutPageSource.indexOf("href={backToReviewHref}"),
    checkoutPageSource.indexOf("primaryAction={"),
  );
  expect(checkoutPageSource).toContain('className="sm:w-auto sm:min-w-[10rem]"');
  expect(backActionBlock).not.toContain('className="sm:flex-1"');
});

it("does not render a trailing price chip in the final Stripe payment CTA", () => {
  expect(stripePaymentFormSource).not.toContain("trailingMeta={");
  expect(stripePaymentFormSource).not.toContain("formatCentsAsCHF");
  expect(stripePaymentFormSource).toContain('{isSubmitting ? t("paymentConfirming") : buttonLabel}');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- frontend/tests/checkout-payment-contract.test.ts`

Expected: FAIL because checkout still uses the equal-width back-action class and `StripePaymentForm` still renders the total chip with `formatCentsAsCHF`.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx
<ActionLink
  href={backToReviewHref}
  variant="secondary"
  fullWidth
  className="sm:w-auto sm:min-w-[10rem]"
  leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
>
  {t("backToReview")}
</ActionLink>
```

```tsx
// frontend/src/components/product/StripePaymentForm.tsx
import { ActionButton } from "./ActionButton";
import { FlowActionDock } from "./FlowActionDock";

export function StripePaymentForm({
  priceCents,
  returnUrl,
  buttonLabel,
  secondaryAction,
}: StripePaymentFormProps) {
  // keep the prop for upstream compatibility even though the CTA no longer renders it
  void priceCents;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      ...
      <FlowActionDock
        desktopSticky
        secondaryAction={secondaryAction}
        primaryAction={
          <ActionButton
            type="submit"
            fullWidth
            className="sm:flex-1"
            disabled={!stripe || !elements}
            loading={isSubmitting}
            contentClassName="w-full"
          >
            {isSubmitting ? t("paymentConfirming") : buttonLabel}
          </ActionButton>
        }
      />
    </form>
  );
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- frontend/tests/checkout-payment-contract.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/checkout-payment-contract.test.ts frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx frontend/src/components/product/StripePaymentForm.tsx
git commit -m "fix(frontend): simplify checkout and payment actions"
```

---

### Task 6: Document the main-only workflow and merge recent work back to `main`

**Files:**
- Modify: `.github/copilot-instructions.md`
- Modify: `TASKS.md`

- [ ] **Step 1: Write the failing instruction update**

```md
<!-- .github/copilot-instructions.md -->
## Git workflow preference

- Work on `main` directly for this repository unless the user explicitly requests something else.
- Do not create git worktrees for Swiss Mail.
- Do not create feature branches for Swiss Mail.
- Make regular, descriptive commits on `main` while working.
```

```md
<!-- TASKS.md -->
**Workflow preference:** Work directly on `main` in this repository. Do not create extra worktrees or feature branches unless the user explicitly asks for them. Use regular, descriptive commits while working.
```

- [ ] **Step 2: Apply the documentation update and verify the files contain it**

Run: `npm test -- frontend/tests/thread-action-card.test.ts frontend/tests/body-step-first-draft-modal.test.ts frontend/tests/intake-quick-attach.test.ts frontend/tests/review-page.test.ts frontend/tests/flow-action-dock.test.ts frontend/tests/checkout-payment-contract.test.ts`

Expected: PASS, then `rg -n "Do not create git worktrees|Work on \`main\` directly|regular, descriptive commits" .github/copilot-instructions.md TASKS.md` prints the new workflow guidance.

- [ ] **Step 3: Merge the recent branches into `main` from the existing main worktree**

```bash
git -C /tmp/swiss-mail-main-EfmiEV --no-pager status --short
git -C /tmp/swiss-mail-main-EfmiEV merge --no-ff feat/analytics-admin-dashboard -m "merge: draft workspace polish"
git -C /tmp/swiss-mail-main-EfmiEV merge --no-ff backport-main-cleanup -m "merge: backport main cleanup"
git -C /tmp/swiss-mail-main-EfmiEV --no-pager log --oneline -5
```

Expected: the main worktree is clean before merging, both merges succeed without conflicts, and the latest log shows the merge commits on `main`.

- [ ] **Step 4: Remove the extra worktrees, switch the primary checkout to `main`, and delete merged branches**

```bash
git worktree remove /tmp/swiss-mail-main2-C7DxqW
git worktree remove /tmp/swiss-mail-main-EfmiEV
git checkout main
git branch -d feat/analytics-admin-dashboard backport-main-cleanup
git --no-pager branch --sort=-committerdate --format='%(refname:short)' | head -10
git worktree list
```

Expected: the primary checkout is now on `main`, the extra `/tmp` worktrees are gone, the merged local branches are deleted, and `git worktree list` shows only `/home/sam/dev/swiss-mail`.

- [ ] **Step 5: Commit the instruction update on `main`**

```bash
git add .github/copilot-instructions.md TASKS.md
git commit -m "docs: record main-only swiss mail workflow"
```

---

## Self-review

- **Spec coverage:** Task 1 covers desktop CTA sizing and body-generation contrast. Task 2 covers the first-draft-ready guidance plus locale keys. Task 3 covers quick-attach multi-file uploads. Task 4 covers the sticky review dock and bottom padding. Task 5 covers checkout desktop action layout and final payment CTA semantics. Task 6 covers the requested main-only workflow documentation and merging back to `main`.
- **Placeholder scan:** No `TODO`, `TBD`, “handle later”, or “similar to” placeholders remain.
- **Type consistency:** All referenced file names, locale keys, and component names match the current codebase (`ThreadActionCard`, `BodyGenerationDialog`, `BodyStep`, `IntakeStep`, `FlowActionDock`, `StripePaymentForm`).
