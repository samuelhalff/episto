# Production Flow Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the draft/review/checkout journey into one production-ready customer flow with correct back navigation, stable desktop preview behavior, compact dock actions, better subject/payment UX, and secure post-payment PDF access.

**Architecture:** Add a small shared customer-flow helper for route/back resolution and a shared action dock for review/checkout/payment surfaces. Keep risky behavior in focused client helpers: session-scoped preview preference storage, authenticated PDF download handling, and textarea autosizing, while preserving the existing backend/provider boundaries and Stripe Payment Element contract.

**Tech Stack:** Next.js, React, TypeScript, next-intl, Stripe Payment Element, Vitest

---

## File Map

- Create: `frontend/src/lib/customer-flow.ts` — ordered customer-flow graph and route helpers for workspace, review, checkout, and confirmation failure.
- Create: `frontend/src/components/product/draft-flow/preview-panel-preference.ts` — session-storage helpers for desktop preview visibility keyed by draft.
- Create: `frontend/src/components/product/FlowActionDock.tsx` — shared sticky dock wrapper for review, checkout, and Stripe payment actions.
- Create: `frontend/src/lib/download-file.ts` — authenticated PDF download helper that converts API responses into browser downloads and reuses canonical API errors.
- Create: `frontend/src/components/product/ProtectedPdfDownloadButton.tsx` — reusable download button with loading and inline error handling.
- Create: `frontend/tests/customer-flow-navigation.test.ts` — unit coverage for the ordered flow graph.
- Create: `frontend/tests/customer-flow-back-wiring.test.ts` — source contract for review/checkout/confirmation back wiring.
- Create: `frontend/tests/preview-panel-preference.test.ts` — regression coverage for per-draft preview persistence wiring.
- Create: `frontend/tests/flow-action-dock.test.ts` — source contract for shared sticky dock adoption.
- Create: `frontend/tests/subject-step-textarea.test.ts` — source contract for textarea + autosize subject editing.
- Create: `frontend/tests/checkout-payment-contract.test.ts` — source/messages contract for pricing CTA, email copy, and Stripe method ordering.
- Create: `frontend/tests/protected-pdf-download-button.test.ts` — source contract for authenticated PDF download wiring.
- Modify: `frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx` — consume shared flow/back helpers and persist preview visibility.
- Modify: `frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx` — skip first-paint transition and stay visually stable across step changes.
- Modify: `frontend/src/components/product/draft-flow/SubjectStep.tsx` — switch to an autosizing textarea while keeping single-line normalized persistence.
- Modify: `frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx` — remove spinner+dot duplication and fix low-contrast loading styling.
- Modify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx` — use shared back path and shared dock.
- Modify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx` — use shared back path, full-width email layout, pricing CTA, and shared dock.
- Modify: `frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx` — use shared checkout return path and protected PDF download button.
- Modify: `frontend/src/app/[locale]/status/[orderToken]/page.tsx` — add protected PDF download action beside the existing order-status UI.
- Modify: `frontend/src/components/product/StripePaymentForm.tsx` — use shared dock and keep Stripe payment methods honest and compact.
- Modify: `frontend/src/messages/en-CH.json` — compact CTA copy, checkout explanation, secure-download copy, and drafting loading label.
- Modify: `frontend/src/messages/de-CH.json` — compact CTA copy, checkout explanation, secure-download copy, and drafting loading label.
- Modify: `frontend/src/messages/fr-CH.json` — compact CTA copy, checkout explanation, secure-download copy, and drafting loading label.
- Modify: `frontend/src/messages/it-CH.json` — compact CTA copy, checkout explanation, secure-download copy, and drafting loading label.
- Modify: `frontend/tests/draft-step-copy.test.ts` — lock the new short CTA vocabulary.
- Modify: `frontend/tests/body-generation-dialog.test.ts` — lock the dot-only drafting state.

### Task 1: Ordered customer-flow graph

**Files:**
- Create: `frontend/src/lib/customer-flow.ts`
- Test: `frontend/tests/customer-flow-navigation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import {
  CUSTOMER_FLOW_STEPS,
  getCustomerFlowBackPath,
  getCustomerFlowPath,
  getNextCustomerFlowStep,
  getPreviousCustomerFlowStep,
} from "../src/lib/customer-flow";

describe("customer flow graph", () => {
  it("keeps one ordered path from intake through checkout", () => {
    expect(CUSTOMER_FLOW_STEPS).toEqual([
      "intake",
      "sender",
      "recipient",
      "body",
      "attachments",
      "subject",
      "logistics",
      "review",
      "checkout",
    ]);
  });

  it("returns the previous and next step across workspace and page boundaries", () => {
    expect(getPreviousCustomerFlowStep("sender")).toBe("intake");
    expect(getPreviousCustomerFlowStep("review")).toBe("logistics");
    expect(getPreviousCustomerFlowStep("checkout")).toBe("review");
    expect(getNextCustomerFlowStep("logistics")).toBe("review");
    expect(getNextCustomerFlowStep("review")).toBe("checkout");
    expect(getNextCustomerFlowStep("checkout")).toBeNull();
  });

  it("builds canonical routes for every flow step", () => {
    expect(getCustomerFlowPath("draft_123", "intake")).toBe("/draft/draft_123");
    expect(getCustomerFlowPath("draft_123", "logistics")).toBe(
      "/draft/draft_123/logistics",
    );
    expect(getCustomerFlowPath("draft_123", "review")).toBe("/draft/draft_123/review");
    expect(getCustomerFlowPath("draft_123", "checkout")).toBe(
      "/draft/draft_123/checkout",
    );
    expect(getCustomerFlowBackPath("draft_123", "checkout")).toBe(
      "/draft/draft_123/review",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/customer-flow-navigation.test.ts`

Expected: FAIL with `Cannot find module '../src/lib/customer-flow'`.

- [ ] **Step 3: Write minimal implementation**

```ts
import {
  getDraftWorkspacePath,
  isDraftWorkspaceStepSlug,
  type DraftWorkspaceStepSlug,
} from "../components/product/draft-flow/steps";

export type CustomerFlowStep = DraftWorkspaceStepSlug | "review" | "checkout";

export const CUSTOMER_FLOW_STEPS: CustomerFlowStep[] = [
  "intake",
  "sender",
  "recipient",
  "body",
  "attachments",
  "subject",
  "logistics",
  "review",
  "checkout",
];

export function isDraftWorkspaceCustomerFlowStep(
  step: CustomerFlowStep | null,
): step is DraftWorkspaceStepSlug {
  return step !== null && isDraftWorkspaceStepSlug(step);
}

export function getPreviousCustomerFlowStep(
  currentStep: CustomerFlowStep,
): CustomerFlowStep | null {
  const index = CUSTOMER_FLOW_STEPS.indexOf(currentStep);
  if (index <= 0) {
    return null;
  }

  return CUSTOMER_FLOW_STEPS[index - 1] ?? null;
}

export function getNextCustomerFlowStep(
  currentStep: CustomerFlowStep,
): CustomerFlowStep | null {
  const index = CUSTOMER_FLOW_STEPS.indexOf(currentStep);
  if (index === -1 || index >= CUSTOMER_FLOW_STEPS.length - 1) {
    return null;
  }

  return CUSTOMER_FLOW_STEPS[index + 1] ?? null;
}

export function getCustomerFlowPath(
  draftId: string,
  step: CustomerFlowStep,
): string {
  switch (step) {
    case "review":
      return `/draft/${draftId}/review`;
    case "checkout":
      return `/draft/${draftId}/checkout`;
    default:
      return getDraftWorkspacePath(draftId, step);
  }
}

export function getCustomerFlowBackPath(
  draftId: string,
  currentStep: CustomerFlowStep,
): string | null {
  const previousStep = getPreviousCustomerFlowStep(currentStep);
  return previousStep ? getCustomerFlowPath(draftId, previousStep) : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/customer-flow-navigation.test.ts`

Expected: PASS with `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/customer-flow.ts frontend/tests/customer-flow-navigation.test.ts
git commit -m "feat(frontend): add customer flow graph"
```

### Task 2: Replace page-local back routes with the shared flow helper

**Files:**
- Modify: `frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx`
- Test: `frontend/tests/customer-flow-back-wiring.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const workspaceSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx",
  ),
  "utf8",
);
const reviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/review/page.tsx"),
  "utf8",
);
const checkoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx"),
  "utf8",
);
const confirmationSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx",
  ),
  "utf8",
);

describe("customer flow back wiring", () => {
  it("uses the shared customer-flow helper instead of page-local back routes", () => {
    expect(workspaceSource).toContain('from "../../../lib/customer-flow"');
    expect(reviewSource).toContain('from "../../../../../lib/customer-flow"');
    expect(checkoutSource).toContain('from "../../../../../lib/customer-flow"');
    expect(confirmationSource).toContain('from "../../../../../lib/customer-flow"');

    expect(reviewSource).toContain('router.push(getCustomerFlowPath(draftId, "logistics"))');
    expect(reviewSource).not.toContain("router.push(`/draft/${draftId}`)");

    expect(checkoutSource).toContain(
      'const backToReviewHref = getCustomerFlowBackPath(draftId, "checkout")',
    );
    expect(confirmationSource).toContain('getCustomerFlowPath(draftId, "checkout")');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/customer-flow-back-wiring.test.ts`

Expected: FAIL because none of these files import `customer-flow.ts` yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
// DraftWorkspaceClient.tsx
import {
  getPreviousCustomerFlowStep,
  isDraftWorkspaceCustomerFlowStep,
} from "../../../lib/customer-flow";

const previousFlowStep = getPreviousCustomerFlowStep(currentStepSlug);
const previousStepSlug = isDraftWorkspaceCustomerFlowStep(previousFlowStep)
  ? previousFlowStep
  : undefined;
```

```tsx
// review/page.tsx
import { getCustomerFlowPath } from "../../../../../lib/customer-flow";

function handleBackToDraft() {
  if (transitionDraft.isPending) return;
  setBackError(null);

  void transitionDraft
    .mutateAsync({ status: "fields_complete" })
    .then(() => {
      router.push(getCustomerFlowPath(draftId, "logistics"));
    })
    .catch((err: unknown) => {
      setBackError(getApiErrorUserMessage(err) ?? tc("error"));
      captureError(err instanceof Error ? err : new Error(String(err)), {
        component: "ReviewPage",
        route: `/draft/${draftId}/review`,
      });
    });
}
```

```tsx
// checkout/page.tsx
import { getCustomerFlowBackPath } from "../../../../../lib/customer-flow";

const backToReviewHref =
  getCustomerFlowBackPath(draftId, "checkout") ?? `/draft/${draftId}/review`;
```

```tsx
// confirmation/page.tsx
import { getCustomerFlowPath } from "../../../../../lib/customer-flow";

<ActionLink
  href={getCustomerFlowPath(draftId, "checkout")}
  variant="secondary"
  leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
>
  {t("backToCheckout")}
</ActionLink>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/customer-flow-back-wiring.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx \
  frontend/src/app/[locale]/draft/[draftId]/review/page.tsx \
  frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx \
  frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx \
  frontend/tests/customer-flow-back-wiring.test.ts
git commit -m "refactor(frontend): share flow back navigation"
```

### Task 3: Persist desktop preview visibility and remove first-paint reanimation

**Files:**
- Create: `frontend/src/components/product/draft-flow/preview-panel-preference.ts`
- Modify: `frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx`
- Modify: `frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx`
- Test: `frontend/tests/preview-panel-preference.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const workspaceSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx",
  ),
  "utf8",
);
const previewPaneSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx",
  ),
  "utf8",
);

describe("preview panel preference", () => {
  it("reuses a per-draft preference instead of forcing open or closed on every mount", () => {
    expect(workspaceSource).toContain('readPreviewPanelPreference(draftId) ?? true');
    expect(workspaceSource).toContain("writePreviewPanelPreference(draftId, next)");
    expect(workspaceSource).not.toContain("setIsPreviewPanelOpen(true);");
    expect(workspaceSource).not.toContain("setIsPreviewPanelOpen(false);");
    expect(previewPaneSource).toContain("transition-none");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/preview-panel-preference.test.ts`

Expected: FAIL because the preference helper and `transition-none` guard do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// preview-panel-preference.ts
const PREFIX = "swiss-mail.preview-panel";

function getSessionStorage(): Storage | null {
  if (typeof globalThis === "undefined" || !("sessionStorage" in globalThis)) {
    return null;
  }

  return globalThis.sessionStorage;
}

export function readPreviewPanelPreference(draftId: string): boolean | null {
  const raw = getSessionStorage()?.getItem(`${PREFIX}:${draftId}`);
  if (raw === "open") return true;
  if (raw === "closed") return false;
  return null;
}

export function writePreviewPanelPreference(draftId: string, isOpen: boolean) {
  getSessionStorage()?.setItem(`${PREFIX}:${draftId}`, isOpen ? "open" : "closed");
}
```

```tsx
// DraftWorkspaceClient.tsx
import {
  readPreviewPanelPreference,
  writePreviewPanelPreference,
} from "./preview-panel-preference";

const [isPreviewPanelOpen, setIsPreviewPanelOpen] = useState(
  () => readPreviewPanelPreference(draftId) ?? true,
);

useEffect(() => {
  setIsPreviewPanelOpen(readPreviewPanelPreference(draftId) ?? true);
}, [draftId]);

const handleTogglePreview = useCallback(() => {
  setIsPreviewPanelOpen((prev) => {
    const next = !prev;
    writePreviewPanelPreference(draftId, next);
    return next;
  });
}, [draftId]);

const handleClosePreview = useCallback(() => {
  writePreviewPanelPreference(draftId, false);
  setIsPreviewPanelOpen(false);
}, [draftId]);

const isPreviewPanelVisible = isWideViewport && isPreviewPanelOpen;
```

```tsx
// WorkspacePreviewPane.tsx
import { useEffect, useState } from "react";

const [transitionsEnabled, setTransitionsEnabled] = useState(false);

useEffect(() => {
  const frame = window.requestAnimationFrame(() => setTransitionsEnabled(true));
  return () => window.cancelAnimationFrame(frame);
}, []);

<div
  className={[
    "flex h-full shrink-0 flex-col overflow-hidden bg-[var(--app-surface-soft)]",
    transitionsEnabled
      ? "transition-[width,opacity] duration-300 ease-out"
      : "transition-none",
    isOpen
      ? "w-[520px] border-l border-[var(--app-border)] opacity-100"
      : "w-0 border-l border-transparent opacity-0",
  ].join(" ")}
  aria-hidden={!isOpen}
  {...(!isOpen ? { inert: true } : undefined)}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/preview-panel-preference.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/product/draft-flow/preview-panel-preference.ts \
  frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx \
  frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx \
  frontend/tests/preview-panel-preference.test.ts
git commit -m "fix(frontend): persist draft preview visibility"
```

### Task 4: Share the sticky action dock and lock compact CTA copy

**Files:**
- Create: `frontend/src/components/product/FlowActionDock.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- Modify: `frontend/src/components/product/StripePaymentForm.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Create: `frontend/tests/flow-action-dock.test.ts`
- Modify: `frontend/tests/draft-step-copy.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/tests/flow-action-dock.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const reviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/review/page.tsx"),
  "utf8",
);
const checkoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx"),
  "utf8",
);
const stripeSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/StripePaymentForm.tsx"),
  "utf8",
);

describe("flow action dock", () => {
  it("routes review, checkout, and Stripe actions through the shared sticky dock", () => {
    expect(reviewSource).toContain("<FlowActionDock");
    expect(checkoutSource).toContain("<FlowActionDock");
    expect(stripeSource).toContain("<FlowActionDock");
  });
});
```

```ts
// frontend/tests/draft-step-copy.test.ts
import { describe, expect, it } from "vitest";

import de from "../src/messages/de-CH.json";
import en from "../src/messages/en-CH.json";
import fr from "../src/messages/fr-CH.json";
import itLocale from "../src/messages/it-CH.json";

describe("draft step CTA copy", () => {
  it("keeps the bottom primary actions as compact verbs", () => {
    expect(en.draft.continueToSender).toBe("Next");
    expect(en.draft.continueToRecipient).toBe("Next");
    expect(en.draft.continueToContent).toBe("Next");
    expect(en.draft.continueToAttachments).toBe("Next");
    expect(en.draft.continueToSubject).toBe("Next");
    expect(en.draft.continueToLogistics).toBe("Next");
    expect(en.draft.continueToReview).toBe("Next");
    expect(en.draft.backToSender).toBe("Back");
    expect(en.draft.backToRecipient).toBe("Back");
    expect(en.draft.backToContent).toBe("Back");
    expect(en.draft.backToAttachments).toBe("Back");
    expect(en.draft.backToSubject).toBe("Back");
    expect(en.checkout.continueToPayment).toBe("Next");
    expect(en.checkout.backToReview).toBe("Back");
    expect(en.review.proceedToPayment).toBe("Next");
    expect(en.review.backToDraft).toBe("Back");
    expect(en.checkout.sendMyLetter).toBe("Pay");

    expect(de.checkout.continueToPayment).toBe("Weiter");
    expect(de.checkout.backToReview).toBe("Zurück");
    expect(de.checkout.sendMyLetter).toBe("Bezahlen");

    expect(fr.checkout.continueToPayment).toBe("Suivant");
    expect(fr.checkout.backToReview).toBe("Retour");
    expect(fr.checkout.sendMyLetter).toBe("Payer");

    expect(itLocale.checkout.continueToPayment).toBe("Avanti");
    expect(itLocale.checkout.backToReview).toBe("Indietro");
    expect(itLocale.checkout.sendMyLetter).toBe("Paga");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- frontend/tests/flow-action-dock.test.ts frontend/tests/draft-step-copy.test.ts`

Expected: FAIL because the dock component does not exist and the message values are still longer.

- [ ] **Step 3: Write minimal implementation**

```tsx
// FlowActionDock.tsx
import type { ReactNode } from "react";

interface FlowActionDockProps {
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

export function FlowActionDock({
  primaryAction,
  secondaryAction,
  className,
}: FlowActionDockProps) {
  return (
    <div
      className={[
        "app-sticky-bar sticky bottom-4 z-10 rounded-2.5xl p-2",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {secondaryAction}
        {primaryAction}
      </div>
    </div>
  );
}
```

```tsx
// review/page.tsx
import { FlowActionDock } from "../../../../../components/product/FlowActionDock";

<FlowActionDock
  secondaryAction={
    <ActionButton
      fullWidth
      variant="secondary"
      onClick={handleBackToDraft}
      className="sm:flex-1"
      leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
    >
      {t("backToDraft")}
    </ActionButton>
  }
  primaryAction={
    <ActionButton
      fullWidth
      className="sm:flex-1"
      onClick={handleProceedToPayment}
      disabled={!canProceedToPayment}
      loading={reviewDraft.isPending || updateDraft.isPending}
      trailingIcon={<ChevronRight className="h-4 w-4 shrink-0" />}
    >
      {t("proceedToPayment")}
    </ActionButton>
  }
/>;
```

```tsx
// checkout/page.tsx
import { FlowActionDock } from "../../../../../components/product/FlowActionDock";

<FlowActionDock
  secondaryAction={
    <ActionLink
      href={backToReviewHref}
      variant="secondary"
      fullWidth
      className="sm:flex-1"
      leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
    >
      {t("backToReview")}
    </ActionLink>
  }
  primaryAction={
    <ActionButton
      type="submit"
      fullWidth
      className="sm:flex-1"
      disabled={
        !isValid ||
        hasBlockingPricingError ||
        hasBlockingStripeConfigurationError ||
        !canRequestQuote
      }
      loading={isSubmitting}
      trailingIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
      contentClassName="w-full"
    >
      {t("continueToPayment")}
    </ActionButton>
  }
/>;
```

```tsx
// StripePaymentForm.tsx
import { FlowActionDock } from "./FlowActionDock";

<FlowActionDock
  className="sm:bg-transparent sm:p-0 sm:shadow-none sm:outline-none sm:backdrop-blur-none"
  secondaryAction={secondaryAction}
  primaryAction={
    <ActionButton
      type="submit"
      fullWidth
      className="sm:flex-1"
      disabled={!stripe || !elements}
      loading={isSubmitting}
      trailingMeta={
        <span className="hidden rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--action-primary-fg)]/90 sm:inline-flex">
          {formatCentsAsCHF(priceCents)}
        </span>
      }
      contentClassName="w-full"
    >
      {isSubmitting ? t("paymentConfirming") : buttonLabel}
    </ActionButton>
  }
/>;
```

```json
// en-CH.json
"continueToSender": "Next",
"continueToRecipient": "Next",
"continueToContent": "Next",
"continueToAttachments": "Next",
"continueToSubject": "Next",
"continueToLogistics": "Next",
"continueToReview": "Next",
"backToSender": "Back",
"backToRecipient": "Back",
"backToContent": "Back",
"backToAttachments": "Back",
"backToSubject": "Back",
"proceedToPayment": "Next",
"backToDraft": "Back",
"continueToPayment": "Next",
"backToReview": "Back",
"sendMyLetter": "Pay"
```

```json
// de-CH.json
"continueToSender": "Weiter",
"continueToRecipient": "Weiter",
"continueToContent": "Weiter",
"continueToAttachments": "Weiter",
"continueToSubject": "Weiter",
"continueToLogistics": "Weiter",
"continueToReview": "Weiter",
"backToSender": "Zurück",
"backToRecipient": "Zurück",
"backToContent": "Zurück",
"backToAttachments": "Zurück",
"backToSubject": "Zurück",
"proceedToPayment": "Weiter",
"backToDraft": "Zurück",
"continueToPayment": "Weiter",
"backToReview": "Zurück",
"sendMyLetter": "Bezahlen"
```

```json
// fr-CH.json
"continueToSender": "Suivant",
"continueToRecipient": "Suivant",
"continueToContent": "Suivant",
"continueToAttachments": "Suivant",
"continueToSubject": "Suivant",
"continueToLogistics": "Suivant",
"continueToReview": "Suivant",
"backToSender": "Retour",
"backToRecipient": "Retour",
"backToContent": "Retour",
"backToAttachments": "Retour",
"backToSubject": "Retour",
"proceedToPayment": "Suivant",
"backToDraft": "Retour",
"continueToPayment": "Suivant",
"backToReview": "Retour",
"sendMyLetter": "Payer"
```

```json
// it-CH.json
"continueToSender": "Avanti",
"continueToRecipient": "Avanti",
"continueToContent": "Avanti",
"continueToAttachments": "Avanti",
"continueToSubject": "Avanti",
"continueToLogistics": "Avanti",
"continueToReview": "Avanti",
"backToSender": "Indietro",
"backToRecipient": "Indietro",
"backToContent": "Indietro",
"backToAttachments": "Indietro",
"backToSubject": "Indietro",
"proceedToPayment": "Avanti",
"backToDraft": "Indietro",
"continueToPayment": "Avanti",
"backToReview": "Indietro",
"sendMyLetter": "Paga"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- frontend/tests/flow-action-dock.test.ts frontend/tests/draft-step-copy.test.ts`

Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/product/FlowActionDock.tsx \
  frontend/src/app/[locale]/draft/[draftId]/review/page.tsx \
  frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx \
  frontend/src/components/product/StripePaymentForm.tsx \
  frontend/src/messages/en-CH.json \
  frontend/src/messages/de-CH.json \
  frontend/src/messages/fr-CH.json \
  frontend/src/messages/it-CH.json \
  frontend/tests/flow-action-dock.test.ts \
  frontend/tests/draft-step-copy.test.ts
git commit -m "refactor(frontend): share action dock and compact CTAs"
```

### Task 5: Replace the subject input with an autosizing textarea

**Files:**
- Modify: `frontend/src/components/product/draft-flow/SubjectStep.tsx`
- Create: `frontend/tests/subject-step-textarea.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const subjectStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SubjectStep.tsx"),
  "utf8",
);

describe("subject step textarea", () => {
  it("uses an autosizing textarea while keeping normalized subject persistence", () => {
    expect(subjectStepSource).toContain("const textareaRef = useRef<HTMLTextAreaElement>(null);");
    expect(subjectStepSource).toContain("<textarea");
    expect(subjectStepSource).toContain('textarea.style.height = "0px";');
    expect(subjectStepSource).toContain("normalizeLetterSubject(subject,");
    expect(subjectStepSource).not.toContain("<input");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/subject-step-textarea.test.ts`

Expected: FAIL because `SubjectStep.tsx` still renders `<input>`.

- [ ] **Step 3: Write minimal implementation**

```tsx
const textareaRef = useRef<HTMLTextAreaElement>(null);

useEffect(() => {
  const textarea = textareaRef.current;
  if (!textarea) return;

  textarea.style.height = "0px";
  const nextHeight = Math.min(textarea.scrollHeight, 176);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > 176 ? "auto" : "hidden";
}, [subject]);
```

```tsx
<Card isCompactViewport={isCompactViewport} density="thin">
  <textarea
    ref={textareaRef}
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
    onFocus={() => {
      setIsFieldFocused(true);
      onInputFocusChange?.(true);
    }}
    onBlur={() => {
      setIsFieldFocused(false);
      onInputFocusChange?.(false);
    }}
    rows={3}
    maxLength={200}
    placeholder={t("subjectInputPlaceholder")}
    className="app-form-control min-h-[88px] w-full resize-none bg-transparent font-semibold leading-6 text-zinc-900 placeholder:text-zinc-300 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
  />
</Card>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/subject-step-textarea.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/product/draft-flow/SubjectStep.tsx \
  frontend/tests/subject-step-textarea.test.ts
git commit -m "feat(frontend): expand subject editor to textarea"
```

### Task 6: Polish checkout layout, pricing CTA, and honest Stripe method messaging

**Files:**
- Modify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- Modify: `frontend/src/components/product/StripePaymentForm.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Create: `frontend/tests/checkout-payment-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import en from "../src/messages/en-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const checkoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx"),
  "utf8",
);
const stripeSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/StripePaymentForm.tsx"),
  "utf8",
);

describe("checkout payment contract", () => {
  it("shows a calculating CTA, full-width email input, and honest Stripe method copy", () => {
    expect(checkoutSource).toContain("const isPricingPending = Boolean(pricingPendingMessage);");
    expect(checkoutSource).toContain('? t("calculatingPayment") : t("continueToPayment")');
    expect(checkoutSource).toContain("loading={isSubmitting || isPricingPending}");
    expect(checkoutSource).toContain('pb-[calc(11rem+env(safe-area-inset-bottom))]');
    expect(checkoutSource).toContain('"app-form-control mt-3 w-full');
    expect(stripeSource).toContain('paymentMethodOrder: ["twint", "card"]');
    expect(stripeSource).toContain('t("paymentMethodsHelp")');
    expect(en.checkout.emailHelp).toContain("secure order-status link");
    expect(en.checkout.paymentMethodsHelp).toContain("TWINT");
    expect(en.checkout.calculatingPayment).toBe("Calculating…");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/checkout-payment-contract.test.ts`

Expected: FAIL because the calculating label and payment-method help do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
// checkout/page.tsx
const isPricingPending = Boolean(pricingPendingMessage);
const backToReviewHref =
  getCustomerFlowBackPath(draftId, "checkout") ?? `/draft/${draftId}/review`;

<main
  id="main-content"
  className="mx-auto grid max-w-7xl gap-6 px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)]"
>
<div className="w-full max-w-none">
  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
    {t("orderSummary")}
  </p>
  ...
</div>
</main>

<input
  id="email"
  type="email"
  autoComplete="email"
  inputMode="email"
  placeholder="name@example.com"
  {...register("email")}
  aria-describedby={errors.email ? "email-error" : undefined}
  aria-invalid={errors.email ? "true" : undefined}
  className={[
    "app-form-control mt-3 w-full rounded-xl border px-4 py-3 placeholder:text-zinc-400 focus:outline-none focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500",
    errors.email
      ? "border-destructive focus:border-destructive focus:ring-destructive"
      : "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:border-zinc-500 dark:focus:ring-zinc-700",
  ].join(" ")}
/>
```

```tsx
// checkout/page.tsx primary CTA
<ActionButton
  type="submit"
  fullWidth
  className="sm:flex-1"
  disabled={
    !isValid ||
    hasBlockingPricingError ||
    hasBlockingStripeConfigurationError ||
    !canRequestQuote
  }
  loading={isSubmitting || isPricingPending}
  trailingIcon={isPricingPending ? undefined : <ArrowRight className="h-4 w-4 shrink-0" />}
  contentClassName="w-full"
>
  {isPricingPending ? t("calculatingPayment") : t("continueToPayment")}
</ActionButton>
```

```tsx
// StripePaymentForm.tsx
<p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
  {t("paymentMethodsHelp")}
</p>
<PaymentElement
  options={{
    layout: "tabs",
    paymentMethodOrder: ["twint", "card"],
    fields: {
      billingDetails: {
        email: "never",
      },
    },
  }}
/>
```

```json
// en-CH.json
"emailHelp": "We'll send your receipt here first, then dispatch updates and a secure order-status link where the final PDF stays available while retained. We won't use this address for marketing.",
"paymentMethodsHelp": "TWINT appears first. Cards and supported wallets appear when Stripe and your device make them available.",
"calculatingPayment": "Calculating…"
```

```json
// de-CH.json
"emailHelp": "Wir senden Ihre Quittung zuerst an diese Adresse und danach Versand-Updates sowie einen sicheren Bestellstatus-Link, über den das finale PDF verfügbar bleibt, solange es aufbewahrt wird. Keine Werbung.",
"paymentMethodsHelp": "TWINT erscheint zuerst. Karten und unterstützte Wallets werden angezeigt, wenn Stripe und Ihr Gerät sie freigeben.",
"calculatingPayment": "Berechnung…"
```

```json
// fr-CH.json
"emailHelp": "Nous enverrons d'abord votre reçu à cette adresse, puis les mises à jour d'envoi et un lien sécurisé vers le statut de la commande, où le PDF final reste disponible pendant la période de conservation. Aucun marketing.",
"paymentMethodsHelp": "TWINT apparaît d'abord. Les cartes et portefeuilles pris en charge s'affichent lorsque Stripe et votre appareil les rendent disponibles.",
"calculatingPayment": "Calcul…"
```

```json
// it-CH.json
"emailHelp": "Invieremo prima la ricevuta a questo indirizzo, poi gli aggiornamenti di spedizione e un link sicuro allo stato dell'ordine, dove il PDF finale resta disponibile finché viene conservato. Nessun marketing.",
"paymentMethodsHelp": "TWINT appare per primo. Carte e wallet supportati vengono mostrati quando Stripe e il tuo dispositivo li rendono disponibili.",
"calculatingPayment": "Calcolo…"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/checkout-payment-contract.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx \
  frontend/src/components/product/StripePaymentForm.tsx \
  frontend/src/messages/en-CH.json \
  frontend/src/messages/de-CH.json \
  frontend/src/messages/fr-CH.json \
  frontend/src/messages/it-CH.json \
  frontend/tests/checkout-payment-contract.test.ts
git commit -m "feat(frontend): polish checkout payment states"
```

### Task 7: Add protected PDF download actions to confirmation and status

**Files:**
- Create: `frontend/src/lib/download-file.ts`
- Create: `frontend/src/components/product/ProtectedPdfDownloadButton.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx`
- Modify: `frontend/src/app/[locale]/status/[orderToken]/page.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Create: `frontend/tests/protected-pdf-download-button.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const confirmationSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx",
  ),
  "utf8",
);
const statusSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/status/[orderToken]/page.tsx"),
  "utf8",
);
const helperSourcePath = path.join(repoRoot, "frontend/src/lib/download-file.ts");

describe("protected pdf download button", () => {
  it("moves confirmation and status downloads behind an authenticated helper", () => {
    const helperSource = readFileSync(helperSourcePath, "utf8");
    expect(helperSource).toContain('credentials: "include"');
    expect(helperSource).toContain("URL.createObjectURL");
    expect(helperSource).toContain("new ApiError");
    expect(confirmationSource).toContain("<ProtectedPdfDownloadButton");
    expect(statusSource).toContain("<ProtectedPdfDownloadButton");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/protected-pdf-download-button.test.ts`

Expected: FAIL with `ENOENT` because `download-file.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// download-file.ts
import { ApiError, getApiUrl } from "./api";

export async function downloadFile(path: string, fallbackFileName: string) {
  const response = await fetch(getApiUrl(path), {
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body, { path, method: "GET" });
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackFileName;
  link.click();
  URL.revokeObjectURL(url);
}
```

```tsx
// ProtectedPdfDownloadButton.tsx
"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { ActionButton } from "./ActionButton";
import { downloadFile } from "../../lib/download-file";
import { getApiErrorUserMessage } from "../../lib/api";

interface ProtectedPdfDownloadButtonProps {
  path: string;
  fallbackFileName: string;
  label: string;
  unavailableMessage: string;
}

export function ProtectedPdfDownloadButton({
  path,
  fallbackFileName,
  label,
  unavailableMessage,
}: ProtectedPdfDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    if (isDownloading) return;

    setIsDownloading(true);
    setErrorMessage(null);

    try {
      await downloadFile(path, fallbackFileName);
    } catch (error) {
      setErrorMessage(getApiErrorUserMessage(error) ?? unavailableMessage);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-2">
      <ActionButton
        type="button"
        variant="secondary"
        onClick={handleClick}
        loading={isDownloading}
        leadingIcon={isDownloading ? undefined : <Download className="h-4 w-4" />}
      >
        {label}
      </ActionButton>
      {errorMessage ? <p role="alert" className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  );
}
```

```tsx
// confirmation/page.tsx
import { ProtectedPdfDownloadButton } from "../../../../../components/product/ProtectedPdfDownloadButton";

<ProtectedPdfDownloadButton
  path={`/v1/drafts/${draftId}/pdf`}
  fallbackFileName={`swiss-mail-${draftId.slice(0, 8)}.pdf`}
  label={t("downloadLetter")}
  unavailableMessage={t("downloadUnavailable")}
/>;
```

```tsx
// status/[orderToken]/page.tsx
import { ProtectedPdfDownloadButton } from "../../../../components/product/ProtectedPdfDownloadButton";

<div className="flex flex-col gap-3 sm:flex-row">
  <ProtectedPdfDownloadButton
    path={`/v1/orders/${orderToken}/pdf`}
    fallbackFileName={`swiss-mail-${order.orderRef}.pdf`}
    label={t("downloadLetter")}
    unavailableMessage={t("downloadUnavailable")}
  />
  <Link
    href="/draft/new"
    className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
  >
    <PenLine className="h-4 w-4" />
    {t("sendAnother")}
  </Link>
</div>
```

```json
// en-CH.json
"downloadLetter": "Download final PDF",
"downloadUnavailable": "The final PDF is no longer available."
```

```json
// de-CH.json
"downloadLetter": "Finales PDF herunterladen",
"downloadUnavailable": "Das finale PDF ist nicht mehr verfügbar."
```

```json
// fr-CH.json
"downloadLetter": "Télécharger le PDF final",
"downloadUnavailable": "Le PDF final n'est plus disponible."
```

```json
// it-CH.json
"downloadLetter": "Scarica il PDF finale",
"downloadUnavailable": "Il PDF finale non è più disponibile."
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/protected-pdf-download-button.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/lib/download-file.ts \
  frontend/src/components/product/ProtectedPdfDownloadButton.tsx \
  frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx \
  frontend/src/app/[locale]/status/[orderToken]/page.tsx \
  frontend/src/messages/en-CH.json \
  frontend/src/messages/de-CH.json \
  frontend/src/messages/fr-CH.json \
  frontend/src/messages/it-CH.json \
  frontend/tests/protected-pdf-download-button.test.ts
git commit -m "feat(frontend): add protected pdf downloads"
```

### Task 8: Fix the drafting loading banner for dark mode and single-indicator status

**Files:**
- Modify: `frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Modify: `frontend/tests/body-generation-dialog.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);

const bodyGenerationDialogSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx"),
  "utf8",
);

describe("body generation dialog regressions", () => {
  it("uses a blocking dialog instead of the old inline drafting strip", () => {
    expect(bodyStepSource).toContain('import { BodyGenerationDialog } from "./BodyGenerationDialog";');
    expect(bodyStepSource).toContain("const shouldShowBodyGenerationDialog =");
    expect(bodyStepSource).toContain("<BodyGenerationDialog");
    expect(bodyStepSource).not.toContain("conversation.streamingText ? (");
  });

  it("routes body-step loading through the extracted helper instead of ad-hoc inline flags", () => {
    expect(bodyStepSource).toContain('import { getBodyLoadingState } from "./body-loading-state";');
    expect(bodyStepSource).toContain("const loadingState = getBodyLoadingState({");
    expect(bodyStepSource).toContain(
      "const shouldShowBodyGenerationDialog = loadingState.showBodyGenerationDialog;",
    );
  });

  it("keeps the generation recovery state non-dismissible with refresh first and support disabled", () => {
    expect(bodyGenerationDialogSource).toContain("onEscapeKeyDown={(event) => event.preventDefault()}");
    expect(bodyGenerationDialogSource).toContain("onPointerDownOutside={(event) => event.preventDefault()}");
    expect(bodyGenerationDialogSource).toContain("<PrimaryButton onClick={onRefresh}");
    expect(bodyGenerationDialogSource).toContain("<SecondaryButton disabled");
  });

  it("uses one drafting indicator with readable dark-mode contrast", () => {
    expect(bodyGenerationDialogSource).toContain("loadingLabel");
    expect(bodyGenerationDialogSource).not.toContain("<Loader2");
    expect(bodyGenerationDialogSource).toContain('dark:bg-zinc-100 dark:text-zinc-950');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/body-generation-dialog.test.ts`

Expected: FAIL because the dialog still renders `Loader2` beside the dots.

- [ ] **Step 3: Write minimal implementation**

```tsx
// BodyGenerationDialog.tsx
import { AlertTriangle, LifeBuoy, RefreshCw, Sparkles } from "lucide-react";

interface BodyGenerationDialogProps {
  open: boolean;
  status: "loading" | "error";
  loadingTitle: string;
  loadingDescription: string;
  loadingLabel: string;
  errorTitle: string;
  errorDescription: string;
  refreshLabel: string;
  supportLabel: string;
  onRefresh: () => void;
}
```

```tsx
<div
  className={`inline-flex h-14 w-14 items-center justify-center rounded-3xl ${
    isLoading
      ? "bg-zinc-950 text-white ring-1 ring-zinc-950/10 dark:bg-zinc-100 dark:text-zinc-950 dark:ring-white/10"
      : "bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/14 dark:text-red-200 dark:ring-red-400/18"
  }`}
>
  {isLoading ? <Sparkles className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
</div>
```

```tsx
{isLoading ? (
  <div className="mt-7 w-full rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-4">
    <div className="flex items-center justify-center gap-3">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {loadingLabel}
      </span>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 [animation-delay:-0.2s] dark:bg-amber-300" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 [animation-delay:-0.1s] dark:bg-amber-300" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 dark:bg-amber-300" />
      </div>
    </div>
  </div>
) : (
```

```json
// en-CH.json
"bodyGenerationLoadingLabel": "Drafting"
```

```json
// de-CH.json
"bodyGenerationLoadingLabel": "Formulieren"
```

```json
// fr-CH.json
"bodyGenerationLoadingLabel": "Rédaction"
```

```json
// it-CH.json
"bodyGenerationLoadingLabel": "Stesura"
```

Also update `BodyStep.tsx` to pass the new prop:

```tsx
<BodyGenerationDialog
  ...
  loadingLabel={t("bodyGenerationLoadingLabel")}
  ...
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/body-generation-dialog.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Visually verify the loading dialog in both themes**

Run: `npm run dev`

Expected:
- on the first body-generation pass, the dialog shows only `Drafting` + three dots
- there is no spinner beside the dots
- the icon badge remains readable in both light and dark mode

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/components/product/draft-flow/BodyGenerationDialog.tsx \
  frontend/src/components/product/draft-flow/BodyStep.tsx \
  frontend/src/messages/en-CH.json \
  frontend/src/messages/de-CH.json \
  frontend/src/messages/fr-CH.json \
  frontend/src/messages/it-CH.json \
  frontend/tests/body-generation-dialog.test.ts
git commit -m "fix(frontend): polish drafting loading dialog"
```

## Final verification

- [ ] **Step 1: Run the targeted frontend regression set**

Run:

```bash
npm test -- \
  frontend/tests/customer-flow-navigation.test.ts \
  frontend/tests/customer-flow-back-wiring.test.ts \
  frontend/tests/preview-panel-preference.test.ts \
  frontend/tests/flow-action-dock.test.ts \
  frontend/tests/subject-step-textarea.test.ts \
  frontend/tests/checkout-payment-contract.test.ts \
  frontend/tests/protected-pdf-download-button.test.ts \
  frontend/tests/body-generation-dialog.test.ts \
  frontend/tests/draft-step-copy.test.ts
```

Expected: PASS with all targeted frontend regressions green.

- [ ] **Step 2: Run repository verification**

Run:

```bash
npm run typecheck
npm test
npm run lint
```

Expected:
- `npm run typecheck` passes
- `npm test` passes
- `npm run lint` shows no new frontend issues; if the existing backend warnings in `backend/src/modules/payments/payment.routes.ts` still appear, confirm they are unchanged from baseline rather than newly introduced by this work

- [ ] **Step 3: Review Stripe readiness before calling checkout production-ready**

Manual checklist:
- real Stripe publishable + secret keys configured
- TWINT enabled in Stripe Dashboard
- Apple Pay / Google Pay enabled where relevant
- domain / webhook configuration matches the existing payment-intent flow

Expected: if any of these are missing, the UI remains honest and does not claim unsupported methods are available.
