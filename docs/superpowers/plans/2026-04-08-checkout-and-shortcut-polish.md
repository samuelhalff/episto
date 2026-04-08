# Checkout And Shortcut Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the draft composer shortcut overflow bug, repair Stripe email confirmation handling, and restyle the payment area to a cleaner mobile-first Stripe-aligned presentation.

**Architecture:** Keep the shortcut fit logic in the existing shared layout helper, but promote the leading badge from a boolean into a measured width so the visible shortcuts can budget space correctly. Keep Stripe integration in the existing checkout page and payment form, adding email prefill/defaults plus a lighter visual treatment and an accordion-first Payment Element configuration.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS, Stripe Elements, Vitest

---

### Task 1: Lock the regressions with failing tests

**Files:**
- Modify: `frontend/tests/prompt-shortcut-layout.test.ts`
- Modify: `frontend/tests/prompt-shortcut-ui.test.ts`
- Modify: `frontend/tests/checkout.test.ts`

- [ ] **Step 1: Write the failing shortcut layout tests**

```ts
it("uses the measured leading badge width before fitting shortcuts", () => {
  const layout = resolvePromptShortcutLayout({
    primaryShortcuts: primaryShortcuts.slice(0, 2),
    overflowShortcuts: [],
    availableWidth: 190,
    leadingWidth: 104,
    moreWidth: 68,
    shortcutWidths: new Map([
      ["one", 52],
      ["two", 56],
    ]),
    gap: 8,
  });

  expect(layout.visiblePrimaryShortcuts).toEqual([]);
  expect(layout.sheetShortcuts.map((shortcut) => shortcut.id)).toEqual(["one", "two"]);
});
```

- [ ] **Step 2: Write the failing shortcut source assertions**

```ts
expect(promptShortcutBarSource).toContain("leadingRef");
expect(promptShortcutHookSource).toContain("const leadingRef = useRef<HTMLSpanElement>(null);");
expect(promptShortcutHookSource).toContain("setLeadingWidth(leadingRef.current?.offsetWidth ?? 0)");
```

- [ ] **Step 3: Write the failing checkout source assertions**

```ts
expect(stripePaymentFormSource).toContain("defaultValues:");
expect(stripePaymentFormSource).toContain("billingDetails: {");
expect(stripePaymentFormSource).toContain("email: billingEmail");
expect(stripePaymentFormSource).toContain("layout: { type: \"accordion\"");
expect(checkoutPageSource).toContain("fontFamily: \"'Instrument Sans', 'Inter'");
```

- [ ] **Step 4: Run test files to verify they fail**

Run: `npm test -- frontend/tests/prompt-shortcut-layout.test.ts frontend/tests/prompt-shortcut-ui.test.ts frontend/tests/checkout.test.ts`

Expected: FAIL on the new leading-width, Stripe defaultValues/layout, and payment appearance assertions.

### Task 2: Fix shortcut overflow budgeting

**Files:**
- Modify: `frontend/src/components/product/draft-flow/PromptShortcutBar.tsx`
- Modify: `frontend/src/components/product/draft-flow/useMeasuredPromptShortcutLayout.ts`
- Modify: `frontend/src/components/product/draft-flow/prompt-shortcut-layout.ts`
- Test: `frontend/tests/prompt-shortcut-layout.test.ts`
- Test: `frontend/tests/prompt-shortcut-ui.test.ts`

- [ ] **Step 1: Add leading badge measurement wiring**

```tsx
const { containerRef, moreRef, leadingRef, shortcutRefs, layout } =
  useMeasuredPromptShortcutLayout({
    primaryShortcuts,
    overflowShortcuts,
  });

{leadingSlot ? <span ref={leadingRef} className="min-w-0 shrink-0">{leadingSlot}</span> : null}
```

- [ ] **Step 2: Measure the leading width in the hook**

```ts
const leadingRef = useRef<HTMLSpanElement>(null);
const [leadingWidth, setLeadingWidth] = useState(0);

setLeadingWidth(leadingRef.current?.offsetWidth ?? 0);
```

- [ ] **Step 3: Feed the measured width into the pure layout helper**

```ts
return resolvePromptShortcutLayout({
  primaryShortcuts,
  overflowShortcuts,
  availableWidth,
  shortcutWidths,
  moreWidth,
  leadingWidth,
  gap,
});
```

- [ ] **Step 4: Run shortcut tests to verify they pass**

Run: `npm test -- frontend/tests/prompt-shortcut-layout.test.ts frontend/tests/prompt-shortcut-ui.test.ts`

Expected: PASS

### Task 3: Repair Stripe email handling and restyle the payment area

**Files:**
- Modify: `frontend/src/components/product/StripePaymentForm.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx`
- Test: `frontend/tests/checkout.test.ts`

- [ ] **Step 1: Add the failing checkout expectations if not already present**

```ts
expect(stripePaymentFormSource).toContain("defaultValues:");
expect(stripePaymentFormSource).toContain("email: billingEmail");
expect(stripePaymentFormSource).toContain("layout: { type: \"accordion\"");
```

- [ ] **Step 2: Prefill billing email inside the Payment Element and keep confirm-time billing details**

```tsx
<PaymentElement
  options={{
    defaultValues: {
      billingDetails: {
        email: billingEmail,
      },
    },
    fields: {
      billingDetails: {
        email: "never",
      },
    },
  }}
/>
```

- [ ] **Step 3: Refresh the payment shell and appearance configuration**

```ts
fontFamily:
  "'Instrument Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
```

```tsx
<div className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface)]/95 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-6">
```

- [ ] **Step 4: Run checkout tests to verify they pass**

Run: `npm test -- frontend/tests/checkout.test.ts`

Expected: PASS

### Task 4: Run the focused verification set

**Files:**
- Test: `frontend/tests/prompt-shortcut-layout.test.ts`
- Test: `frontend/tests/prompt-shortcut-ui.test.ts`
- Test: `frontend/tests/checkout.test.ts`

- [ ] **Step 1: Run the focused regression suite**

Run: `npm test -- frontend/tests/prompt-shortcut-layout.test.ts frontend/tests/prompt-shortcut-ui.test.ts frontend/tests/checkout.test.ts`

Expected: PASS
