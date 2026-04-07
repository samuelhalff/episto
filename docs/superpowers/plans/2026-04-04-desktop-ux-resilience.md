# Desktop UX Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop drafting flow feel continuously responsive by standardizing loading states, eliminating blank async gaps, hardening shared button/theme behavior, improving toast visibility, and capturing actionable context for intermittent 500s.

**Architecture:** Keep already-revealed UI visible during async work, move waiting feedback into local components instead of full-screen blanks, and route all customer-facing actions through one semantic button/toast system. Use small focused helpers for pending-turn handoff and API error correlation so the fixes stay reusable across the draft, review, checkout, and confirmation flows.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, TanStack Query v5, Tailwind CSS, Sonner, Vitest

---

## File Map

- `frontend/src/components/ui/app-button.tsx` — new semantic button primitive with variants, loading affordance, icon slots, and dark-mode-safe tokens.
- `frontend/src/components/ui/loading-dots.tsx` — reusable assistant/wait indicator that can render inside the intake thread, inline cards, and small buttons.
- `frontend/src/components/ui/AppToaster.tsx` — shared desktop toast visibility and severity styling.
- `frontend/src/app/globals.css` — button/toast/theme tokens used by the new primitive.
- `frontend/src/components/product/ActionButton.tsx` — wrapper around the shared button primitive for full-width product CTAs and links.
- `frontend/src/components/product/draft-flow/cards.tsx` — migrate `PrimaryButton` and `SecondaryButton` to the shared primitive.
- `frontend/src/components/product/draft-flow/draft-composer.tsx` — reuse shared icon-button and loading state styling in the composer send button.
- `frontend/src/components/product/ConfirmDialog.tsx` — adopt shared button semantics in confirm/cancel actions.
- `frontend/src/app/[locale]/draft/new/page.tsx` — seed draft/message cache, mark pending assistant work before route transition, and render entry buttons through shared primitives.
- `frontend/src/lib/pending-draft-turn.ts` — sessionStorage-backed helper for carrying “assistant response pending” state across route navigation.
- `frontend/src/hooks/use-conversation.ts` — merge SSE state, optimistic messages, cache-seeded messages, and pending-turn storage into one source of truth.
- `frontend/src/components/product/draft-flow/IntakeStep.tsx` — render wait-agnostic thread placeholders and keep the left thread populated while the assistant is pending.
- `frontend/src/components/product/draft-flow/BodyStep.tsx` — align refinement and initial-compose waiting states with the same conversation pending contract.
- `frontend/src/hooks/use-checkout.ts` — separate initial load from background refresh and preserve visible pricing/payment UI during network work.
- `frontend/src/hooks/use-letter-preview.ts` — separate preview boot loading from preview refresh so the sheet never looks blank during invalidation.
- `frontend/src/hooks/use-recipient-company-search.ts` — keep company search responsive with the existing debounce and expose clearer initial-vs-refresh state without layering a second deferral primitive on top.
- `frontend/src/lib/api.ts` — enrich `ApiError` with request metadata and capture 500-class failures once with safe context.
- `frontend/src/lib/error-tracking.ts` — support richer safe metadata for frontend error correlation.
- `frontend/tests/button-system.test.ts` — regression coverage for the shared button primitive and button-family adoption.
- `frontend/tests/toast-visibility.test.ts` — regression coverage for desktop toast severity styling and contrast.
- `frontend/tests/pending-draft-turn.test.ts` — behavior coverage for sessionStorage handoff helpers.
- `frontend/tests/intake-thread-state.test.ts` — regression coverage for assistant-pending intake behavior.
- `frontend/tests/draft-workspace-navigation.test.ts` — regression coverage for draft-entry pending handoff wiring.
- `frontend/tests/api-errors.test.ts` — regression coverage for enriched `ApiError` metadata extraction.
- `frontend/tests/request-state-boundaries.test.ts` — regression coverage for non-blocking request boundaries in checkout/preview/company-search flows.

### Task 1: Correlate Intermittent 500s Before Chasing Backend Guesses

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/error-tracking.ts`
- Test: `frontend/tests/api-errors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/api-errors.test.ts
import { describe, expect, it } from "vitest";

import { ApiError } from "../src/lib/api";

describe("ApiError metadata", () => {
  it("extracts request correlation details from the canonical error envelope", () => {
    const error = new ApiError(
      500,
      {
        error: {
          code: "INTERNAL_ERROR",
          requestId: "req-123",
          userMessage: "Something went wrong. Please try again.",
        },
      },
      { path: "/v1/drafts/draft-1/messages", method: "POST" },
    );

    expect(error.getCode()).toBe("INTERNAL_ERROR");
    expect(error.getRequestId()).toBe("req-123");
    expect(error.path).toBe("/v1/drafts/draft-1/messages");
    expect(error.method).toBe("POST");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- api-errors.test.ts`
Expected: FAIL because `ApiError` currently accepts only `(status, body)` and has no request correlation helpers.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/api.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public request: { path: string; method: string } = {
      path: "unknown",
      method: "unknown",
    },
  ) {
    super(`API error ${status}`);
  }

  get path(): string {
    return this.request.path;
  }

  get method(): string {
    return this.request.method;
  }

  getRequestId(): string | null {
    if (typeof this.body === "object" && this.body !== null && "error" in this.body) {
      const envelope = this.body as { error?: { requestId?: string } };
      return typeof envelope.error?.requestId === "string" ? envelope.error.requestId : null;
    }
    return null;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers, ...init });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error = new ApiError(res.status, body, { path, method });

    if (res.status >= 500) {
      captureError(error, {
        component: "apiFetch",
        errorFamily: "request_failure",
        extra: {
          status: res.status,
          method,
          path,
          code: error.getCode() ?? "UNKNOWN",
          requestId: error.getRequestId() ?? "missing",
        },
      });
    }

    throw error;
  }

  return res.json() as Promise<T>;
}
```

Also audit callers before finalizing the change:

```bash
rg -n "new ApiError\\(" frontend/src frontend/tests
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- api-errors.test.ts`
Expected: PASS with the enriched `ApiError` metadata assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/error-tracking.ts frontend/tests/api-errors.test.ts
git commit -m "test: correlate api 500 errors in frontend tracking"
```

### Task 2: Unify Buttons, Loading Affordances, and Desktop Toast Visibility

**Files:**
- Create: `frontend/src/components/ui/app-button.tsx`
- Create: `frontend/src/components/ui/loading-dots.tsx`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/components/ui/AppToaster.tsx`
- Modify: `frontend/src/components/product/ActionButton.tsx`
- Modify: `frontend/src/components/product/draft-flow/cards.tsx`
- Modify: `frontend/src/components/product/draft-flow/draft-composer.tsx`
- Modify: `frontend/src/components/product/ConfirmDialog.tsx`
- Modify: `frontend/src/app/[locale]/draft/new/page.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- Test: `frontend/tests/button-system.test.ts`
- Test: `frontend/tests/toast-visibility.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/tests/button-system.test.ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppButton } from "../src/components/ui/app-button";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const appButtonPath = path.join(repoRoot, "frontend/src/components/ui/app-button.tsx");
const actionButtonSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/ActionButton.tsx"),
  "utf8",
);
const cardsSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/cards.tsx"),
  "utf8",
);

describe("shared button system", () => {
  it("defines a single reusable app button primitive", () => {
    expect(existsSync(appButtonPath)).toBe(true);
  });

  it("renders a disabled loading button with a spinner affordance", () => {
    const markup = renderToStaticMarkup(
      <AppButton loading variant="primary">
        Save
      </AppButton>,
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain("animate-spin");
  });

  it("routes product button families through the shared primitive", () => {
    expect(actionButtonSource).toContain('from "../ui/app-button"');
    expect(cardsSource).toContain('from "../../ui/app-button"');
  });
});

// frontend/tests/toast-visibility.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const toasterSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/AppToaster.tsx"),
  "utf8",
);
const globalsCssSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);

describe("desktop toast visibility", () => {
  it("adds severity-specific desktop colors instead of neutral-only toasts", () => {
    expect(toasterSource).toContain("success:");
    expect(toasterSource).toContain("warning:");
    expect(toasterSource).toContain("error:");
  });

  it("keeps shared button styles dark-mode-safe", () => {
    expect(globalsCssSource).toContain(".btn-primary");
    expect(globalsCssSource).toContain("dark:bg-amber-400");
    expect(globalsCssSource).toContain(".btn-secondary");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- button-system.test.ts toast-visibility.test.ts`
Expected: FAIL because the shared primitive file does not exist and the toaster is still neutral-only.

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/src/components/ui/app-button.tsx
"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type AppButtonVariant = "primary" | "secondary" | "warning" | "destructive" | "ghost";
type AppButtonSize = "sm" | "md" | "lg" | "icon";

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  trailingMeta?: ReactNode;
  fullWidth?: boolean;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leadingIcon,
    trailingIcon,
    trailingMeta,
    fullWidth = false,
    disabled,
    className = "",
    children,
    type = "button",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      data-variant={variant}
      data-size={size}
      className={[
        variant === "primary"
          ? "btn-primary"
          : variant === "secondary"
            ? "btn-secondary"
            : variant === "warning"
              ? "btn-warning"
              : variant === "destructive"
                ? "btn-destructive"
                : "btn-ghost",
        size === "icon" ? "h-10 w-10 rounded-full px-0 py-0" : "min-h-12",
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : leadingIcon}
      <span className="min-w-0 truncate">{children}</span>
      {!loading ? trailingMeta : null}
      {!loading ? trailingIcon : null}
    </button>
  );
});

// frontend/src/components/ui/AppToaster.tsx
toastOptions={{
  classNames: {
    toast: "!rounded-2xl !border !shadow-lg",
    success: "!border-emerald-300/80 !bg-emerald-50 !text-emerald-950 dark:!border-emerald-400/30 dark:!bg-emerald-500/12 dark:!text-emerald-100",
    warning: "!border-amber-300/80 !bg-amber-50 !text-amber-950 dark:!border-amber-400/30 dark:!bg-amber-500/12 dark:!text-amber-100",
    error: "!border-red-300/80 !bg-red-50 !text-red-950 dark:!border-red-400/30 dark:!bg-red-500/12 dark:!text-red-100",
  },
}}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- button-system.test.ts toast-visibility.test.ts`
Expected: PASS with the shared primitive, behavior-level loading assertion, and severity-aware desktop toast assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/app-button.tsx frontend/src/components/ui/loading-dots.tsx frontend/src/components/ui/AppToaster.tsx frontend/src/app/globals.css frontend/src/components/product/ActionButton.tsx frontend/src/components/product/draft-flow/cards.tsx frontend/src/components/product/draft-flow/draft-composer.tsx frontend/src/components/product/ConfirmDialog.tsx frontend/src/app/[locale]/draft/new/page.tsx frontend/src/app/[locale]/draft/[draftId]/review/page.tsx frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx frontend/tests/button-system.test.ts frontend/tests/toast-visibility.test.ts
git commit -m "feat: unify customer-facing button and toast states"
```

### Task 3: Preserve the Draft Conversation During the Entry-to-Workspace Handoff

**Files:**
- Create: `frontend/src/lib/pending-draft-turn.ts`
- Modify: `frontend/src/app/[locale]/draft/new/page.tsx`
- Modify: `frontend/src/hooks/use-conversation.ts`
- Modify: `frontend/src/components/product/draft-flow/IntakeStep.tsx`
- Modify: `frontend/src/components/product/draft-flow/BodyStep.tsx`
- Modify: `frontend/tests/draft-workspace-navigation.test.ts`
- Test: `frontend/tests/pending-draft-turn.test.ts`
- Test: `frontend/tests/intake-thread-state.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/tests/pending-draft-turn.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  primePendingDraftTurn,
  readPendingDraftTurn,
  clearPendingDraftTurn,
} from "../src/lib/pending-draft-turn";

describe("pending draft turn handoff", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("stores and clears assistant-pending state per draft", () => {
    primePendingDraftTurn({ draftId: "draft-1", messageId: "msg-1" });
    expect(readPendingDraftTurn("draft-1")).toEqual({ draftId: "draft-1", messageId: "msg-1" });
    clearPendingDraftTurn("draft-1");
    expect(readPendingDraftTurn("draft-1")).toBeNull();
  });
});

// frontend/tests/draft-workspace-navigation.test.ts
expect(newDraftPageSource).toContain("primePendingDraftTurn");
expect(newDraftPageSource).toContain("queryClient.setQueryData(queryKeys.draftMessages");
expect(useConversationSource).toContain("readPendingDraftTurn");
expect(useConversationSource).toContain("pendingTurn.messageId");
expect(intakeStepSource).toContain("pendingAssistantPlaceholder");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- pending-draft-turn.test.ts intake-thread-state.test.ts draft-workspace-navigation.test.ts`
Expected: FAIL because the pending-turn helper does not exist and the entry/workspace handoff is not wired.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/lib/pending-draft-turn.ts
const PREFIX = "swiss-mail.pending-draft-turn";

export function primePendingDraftTurn(input: { draftId: string; messageId: string }) {
  window.sessionStorage.setItem(`${PREFIX}:${input.draftId}`, JSON.stringify(input));
}

export function readPendingDraftTurn(draftId: string) {
  const raw = window.sessionStorage.getItem(`${PREFIX}:${draftId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { draftId: string; messageId: string };
  } catch {
    return null;
  }
}

export function clearPendingDraftTurn(draftId: string) {
  window.sessionStorage.removeItem(`${PREFIX}:${draftId}`);
}

// frontend/src/app/[locale]/draft/new/page.tsx
const queryClient = useQueryClient();

if (initialMessage) {
  const response = await apiFetch<{ message: ConversationMessage }>(`/v1/drafts/${draft.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: initialMessage }),
  });
  queryClient.setQueryData(queryKeys.draftMessages(draft.id), [response.message]);
  primePendingDraftTurn({ draftId: draft.id, messageId: response.message.id });
}

startTransition(() => {
  router.replace(`/draft/${draft.id}`);
});

// frontend/src/hooks/use-conversation.ts
const [pendingAssistantPlaceholder, setPendingAssistantPlaceholder] = useState(false);

useEffect(() => {
  const pendingTurn = readPendingDraftTurn(draftId);
  if (pendingTurn) {
    setPendingAssistantPlaceholder(true);
    setIsAwaitingResponse(true);
  }
}, [draftId]);

useEffect(() => {
  const pendingTurn = readPendingDraftTurn(draftId);
  if (!pendingTurn) {
    return;
  }

  const messages = messagesQuery.data ?? [];
  const pendingUserIndex = messages.findIndex((message) => message.id === pendingTurn.messageId);
  const hasAssistantAfterPendingUser =
    pendingUserIndex >= 0 &&
    messages.slice(pendingUserIndex + 1).some((message) => message.role === "assistant");

  if (hasAssistantAfterPendingUser) {
    clearPendingDraftTurn(draftId);
    setPendingAssistantPlaceholder(false);
  }
}, [draftId, messagesQuery.data]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- pending-draft-turn.test.ts intake-thread-state.test.ts draft-workspace-navigation.test.ts`
Expected: PASS with the handoff helper and source wiring assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/pending-draft-turn.ts frontend/src/app/[locale]/draft/new/page.tsx frontend/src/hooks/use-conversation.ts frontend/src/components/product/draft-flow/IntakeStep.tsx frontend/src/components/product/draft-flow/BodyStep.tsx frontend/tests/pending-draft-turn.test.ts frontend/tests/intake-thread-state.test.ts frontend/tests/draft-workspace-navigation.test.ts
git commit -m "feat: preserve pending conversation state across draft entry"
```

### Task 4: Keep High-Traffic Views Responsive During Network and Background Refreshes

**Files:**
- Modify: `frontend/src/hooks/use-checkout.ts`
- Modify: `frontend/src/hooks/use-letter-preview.ts`
- Modify: `frontend/src/hooks/use-recipient-company-search.ts`
- Modify: `frontend/src/components/product/LetterPreviewModal.tsx`
- Modify: `frontend/src/components/product/draft-flow/RecipientStep.tsx`
- Modify: `frontend/src/components/product/StripePaymentForm.tsx`
- Test: `frontend/tests/request-state-boundaries.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/tests/request-state-boundaries.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const checkoutHookSource = readFileSync(path.join(repoRoot, "frontend/src/hooks/use-checkout.ts"), "utf8");
const previewHookSource = readFileSync(path.join(repoRoot, "frontend/src/hooks/use-letter-preview.ts"), "utf8");
const companySearchHookSource = readFileSync(path.join(repoRoot, "frontend/src/hooks/use-recipient-company-search.ts"), "utf8");

describe("request state boundaries", () => {
  it("distinguishes initial load from background refresh in checkout and preview hooks", () => {
    expect(checkoutHookSource).toContain("isBootstrapping");
    expect(checkoutHookSource).toContain("isRefreshing");
    expect(previewHookSource).toContain("isRefreshing");
  });

  it("keeps company search on a single debounce strategy instead of stacked deferrals", () => {
    expect(companySearchHookSource).toContain("debouncedQuery");
    expect(companySearchHookSource).not.toContain("useDeferredValue");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- request-state-boundaries.test.ts`
Expected: FAIL because the hooks currently expose only coarse loading booleans and do not clearly preserve the single-debounce search strategy.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/hooks/use-checkout.ts
const isBootstrapping = paymentQuery.isLoading && !paymentQuery.data && !quoteQuery.data;
const isRefreshing =
  (paymentQuery.isFetching && !!paymentQuery.data) ||
  (quoteQuery.isFetching && !!quoteQuery.data);

return {
  pricing,
  paymentState,
  clientSecret,
  createPaymentIntent,
  isProcessing: checkoutMutation.isPending,
  isBootstrapping,
  isRefreshing,
  error: checkoutMutation.error ?? paymentQuery.error ?? quoteQuery.error ?? null,
};

// frontend/src/hooks/use-letter-preview.ts
const isRefreshing = previewQuery.isFetching && !!previewQuery.data;

return {
  previewData: previewQuery.data ?? null,
  estimatedPageCount: estimatePageCount(previewQuery.data?.body),
  isStale,
  refreshPreview,
  isLoading: previewQuery.isLoading && !previewQuery.data,
  isRefreshing,
  error: previewQuery.error instanceof Error ? previewQuery.error : null,
};

// frontend/src/hooks/use-recipient-company-search.ts
// Keep the existing 250 ms debounce; do not add a second deferral layer.
const normalizedQuery = query.trim();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- request-state-boundaries.test.ts`
Expected: PASS with non-blocking request-state boundaries exposed from the hooks.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-checkout.ts frontend/src/hooks/use-letter-preview.ts frontend/src/hooks/use-recipient-company-search.ts frontend/src/components/product/LetterPreviewModal.tsx frontend/src/components/product/draft-flow/RecipientStep.tsx frontend/src/components/product/StripePaymentForm.tsx frontend/tests/request-state-boundaries.test.ts
git commit -m "refactor: preserve revealed ui during background network work"
```

### Task 5: Run 10 Story-Based QA Passes With Copilot Opus 4.6 After All Previous Todos Are Green

**Files:**
- Verify: `frontend/src/app/[locale]/draft/new/page.tsx`
- Verify: `frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx`
- Verify: `frontend/src/components/product/draft-flow/IntakeStep.tsx`
- Verify: `frontend/src/components/product/draft-flow/BodyStep.tsx`
- Verify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`
- Verify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- Verify: `frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx`
- Create: `docs/superpowers/plans/2026-04-04-desktop-ux-resilience-qa-report.md`
- Create: `docs/superpowers/plans/2026-04-04-desktop-ux-resilience-followups.md` (only if issues are found)
- Create: `docs/superpowers/plans/2026-04-04-desktop-ux-resilience-manual-smoke-report.md`

- [ ] **Step 1: Verify Tasks 1-4 are complete before starting QA**

Run:

```bash
npm --prefix frontend test -- api-errors.test.ts button-system.test.ts toast-visibility.test.ts pending-draft-turn.test.ts intake-thread-state.test.ts draft-workspace-navigation.test.ts request-state-boundaries.test.ts
```

Expected: PASS. If any test fails, do not start story execution yet.

- [ ] **Step 2: Ask Copilot CLI with Opus 4.6 to reason through 10 desktop user stories and write a report**

Run:

```bash
copilot \
  --model claude-opus-4.6 \
  --allow-all-tools \
  --allow-all-paths \
  --no-ask-user \
  -s \
  -p "$(cat <<'PROMPT'
You are acting as a skeptical QA engineer for the Swiss Mail desktop app.

Repository root: /home/sam/dev/swiss-mail

Read docs/superpowers/plans/2026-04-04-desktop-ux-resilience.md first.
Assume Tasks 1-4 have already been implemented and their tests are green.

Reason through and evaluate these 10 user stories from the codebase and available tests:
1. Start a brand-new draft from /draft/new with typed input.
2. Start a brand-new draft from /draft/new using a quick-start tile.
3. Resume an existing draft and choose continue.
4. Resume an existing draft and choose start fresh.
5. Submit intake text and wait for the assistant before first tokens arrive.
6. Refine a generated body draft and verify refinement loading feedback.
7. Upload an attachment during drafting and continue to the next step.
8. Open review, return to editing, then re-open review.
9. Enter checkout, create a payment intent, and observe loading/error feedback.
10. Trigger a server-side 500 and verify the captured frontend error context is actionable.

For each story:
- State whether the current implementation looks solid, risky, or broken.
- Cite the exact files and code paths you used.
- Call out missing loading feedback, network/render regressions, dark-mode contrast issues, toast visibility issues, or observability gaps.

Write the result as concise markdown to docs/superpowers/plans/2026-04-04-desktop-ux-resilience-qa-report.md.
Return a short summary with the highest-severity issues first.
PROMPT
)"
```

Expected: `docs/superpowers/plans/2026-04-04-desktop-ux-resilience-qa-report.md` exists and lists all 10 stories with findings. Treat this as a structured code-review gate, not as the only functional QA signal.

- [ ] **Step 3: If Copilot finds issues, write a follow-up implementation plan before touching more code**

```md
# Desktop UX Resilience Follow-up Plan

For each Copilot finding:
- user story id
- severity
- root cause
- exact files to modify
- failing test to add first
- verification command
```

Save that file to `docs/superpowers/plans/2026-04-04-desktop-ux-resilience-followups.md`.

- [ ] **Step 4: Challenge the follow-up plan with Copilot Opus 4.6 before implementation**

Run:

```bash
copilot \
  --model claude-opus-4.6 \
  --allow-all-tools \
  --allow-all-paths \
  --no-ask-user \
  -s \
  -p "Critique docs/superpowers/plans/2026-04-04-desktop-ux-resilience-followups.md. Identify missing tests, weak sequencing, and any root-cause gaps. Keep the feedback terse and technical."
```

Expected: A short critique that is incorporated into the follow-up plan before any additional fixes are implemented.

- [ ] **Step 5: Manually smoke-test the highest-risk browser flow and write it down**

Run the app locally and manually verify:

1. `/draft/new` with a typed initial prompt
2. the transition into `/draft/[draftId]`
3. the left thread placeholder before first assistant tokens arrive
4. review and checkout buttons in dark mode

Write the result to `docs/superpowers/plans/2026-04-04-desktop-ux-resilience-manual-smoke-report.md`.

- [ ] **Step 6: Only after the report is addressed and re-tested, mark the work done**

Run:

```bash
npm --prefix frontend test
```

Expected: PASS. Do not declare the desktop UX work finished until the follow-up issues, if any, are implemented, the manual smoke report is clean, and the full frontend suite is green again.

## Self-Review

- **Spec coverage:** The plan covers all six requested areas: button loading states, entry/workspace async handoff, React/network render boundaries, dark-mode-safe button reuse, toast visibility, and 500 correlation. It also now includes a final 10-story Copilot-driven QA gate plus a mandatory follow-up-plan loop before the work can be considered finished.
- **Placeholder scan:** No `TBD`, `TODO`, or “implement later” placeholders remain. Every task lists exact files, commands, and concrete code/test snippets.
- **Type consistency:** The plan consistently uses `AppButton`, `LoadingDots`, `pendingAssistantPlaceholder`, `primePendingDraftTurn`, `readPendingDraftTurn`, `clearPendingDraftTurn`, `isBootstrapping`, and `isRefreshing`. No alternate names are introduced later in the plan.
