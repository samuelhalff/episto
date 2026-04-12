# Pricing Simulator And Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static pricing examples block with a clean pricing simulator and align every label/value row on the pricing page to one consistent vertical system.

**Architecture:** Keep the pricing page composition in the existing marketing components, but move simulator logic into a focused `PricingSimulator` component and move pricing math into a small shared helper file. Use shadcn-derived UI primitives for the segmented type toggle and the page-count field, then reuse one shared baseline-aligned row pattern across the simulator and the main pricing cards.

**Tech Stack:** Next.js, React, TypeScript, next-intl, Vitest, @testing-library/react, user-event, shadcn-derived UI primitives, Radix Toggle Group

---

## File map

- Create: `frontend/src/components/marketing/pricing-calculations.ts` — stored-price lookup helpers for page count, bounds, and per-page increment strings.
- Create: `frontend/src/components/marketing/PricingSimulator.tsx` — the interactive simulator card that replaces the old examples table.
- Create: `frontend/src/components/ui/toggle-group.tsx` — shadcn-derived segmented control wrapper using Radix Toggle Group.
- Create: `frontend/src/components/ui/input.tsx` — shadcn-derived input primitive used for the centered readonly page-count field.
- Modify: `frontend/src/components/marketing/PricingTiers.tsx` — swap the examples card for the simulator and reuse shared alignment rows.
- Modify: `frontend/src/components/marketing/pricing-shared.tsx` — expose one baseline-aligned label/value row helper that both the main pricing cards and simulator can use.
- Modify: `frontend/src/components/marketing/PricingFaq.tsx` — only if the shared alignment pass needs spacing cleanup to keep the lower page visually consistent.
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Modify: `frontend/package.json` — add the Radix toggle-group dependency if missing.
- Modify: `package-lock.json` — lockfile update from the frontend dependency install.
- Modify: `docs/03-ux/page-specifications-part-01.md` — replace the old examples-table description with the approved simulator behavior.
- Test: `frontend/tests/pricing-calculations.test.ts`
- Test: `frontend/tests/pricing-simulator.runtime.test.ts`
- Modify Test: `frontend/tests/pricing-page.test.ts`

---

### Task 1: Extract pricing simulator math

**Files:**

- Create: `frontend/src/components/marketing/pricing-calculations.ts`
- Test: `frontend/tests/pricing-calculations.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  getExampleForPageCount,
  getPerPageIncrementDisplayPrice,
  getPageBounds,
} from "../src/components/marketing/pricing-calculations";

const standardExamples = [
  { pageCount: 1, totalCents: 495, displayPrice: "CHF 4.95" },
  { pageCount: 2, totalCents: 510, displayPrice: "CHF 5.10" },
  { pageCount: 3, totalCents: 525, displayPrice: "CHF 5.25" },
  { pageCount: 4, totalCents: 540, displayPrice: "CHF 5.40" },
  { pageCount: 5, totalCents: 555, displayPrice: "CHF 5.55" },
] as const;

describe("pricing calculations", () => {
  it("returns the stored per-page increment when adjacent totals move evenly", () => {
    expect(getPerPageIncrementDisplayPrice(standardExamples)).toBe("+CHF 0.15");
  });

  it("returns the exact stored example for a selected page count", () => {
    expect(getExampleForPageCount(standardExamples, 3)?.displayPrice).toBe("CHF 5.25");
  });

  it("returns the minimum and maximum page counts available for the simulator", () => {
    expect(getPageBounds(standardExamples)).toEqual({ min: 1, max: 5 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/pricing-calculations.test.ts'
```

Expected: FAIL because `pricing-calculations.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import { formatCentsAsCHF } from "@/hooks/use-pricing";
import type { PricingExample } from "./pricing-types";

export function getExampleForPageCount(
  examples: readonly PricingExample[],
  pageCount: number,
) {
  return examples.find((example) => example.pageCount === pageCount);
}

export function getPageBounds(examples: readonly PricingExample[]) {
  const first = examples[0];
  const last = examples[examples.length - 1];

  return {
    min: first?.pageCount ?? 1,
    max: last?.pageCount ?? 1,
  };
}

export function getPerPageIncrementDisplayPrice(
  examples: readonly PricingExample[],
): string | undefined {
  if (examples.length < 2) return undefined;

  const increments = examples.slice(1).map((example, index) => {
    const previous = examples[index];
    return previous ? example.totalCents - previous.totalCents : null;
  });

  const firstIncrement = increments[0];
  if (firstIncrement === null || firstIncrement === undefined || firstIncrement < 0) {
    return undefined;
  }

  return increments.every((increment) => increment === firstIncrement)
    ? "+" + formatCentsAsCHF(firstIncrement)
    : undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/pricing-calculations.test.ts'
```

Expected: PASS with 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/marketing/pricing-calculations.ts frontend/tests/pricing-calculations.test.ts
git commit -m "test: lock pricing simulator math" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Build the simulator controls with shadcn primitives

**Files:**

- Modify: `frontend/package.json`
- Modify: `package-lock.json`
- Create: `frontend/src/components/ui/toggle-group.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/marketing/PricingSimulator.tsx`
- Test: `frontend/tests/pricing-simulator.runtime.test.ts`

- [ ] **Step 1: Write the failing runtime test**

```ts
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PricingSimulator } from "../src/components/marketing/PricingSimulator";

const t = (key: string, values?: Record<string, string | number>) => {
  const messages: Record<string, string> = {
    simulatorTitle: "Pricing simulator",
    letterTypeLabel: "Letter type",
    pagesLabel: "Pages",
    increasePagesLabel: "Increase pages",
    decreasePagesLabel: "Decrease pages",
    standardOptionTitle: "Standard",
    registeredOptionTitle: "Registered",
    standardAdditionalPageLabel: "Each additional page",
    registeredUpgradeLabel: "Registered delivery",
    registeredAdditionalPageLabel: "Each additional page",
    pageSingular: "page",
    pagePlural: "pages",
  };
  return (messages[key] ?? key).replace("{pages}", String(values?.pages ?? ""));
};

describe("pricing simulator runtime", () => {
  afterEach(() => cleanup());

  it("updates the live total when letter type or page count changes", async () => {
    const user = userEvent.setup();

    render(
      React.createElement(PricingSimulator, {
        loading: false,
        provider: mockProviderBreakdown,
        registeredSurchargeDisplayPrice: "CHF 4.23",
        t,
      }),
    );

    expect(screen.getByText("Standard · 1 page")).toBeTruthy();
    expect(screen.getByText("CHF 4.95")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Increase pages" }));
    expect(screen.getByText("Standard · 2 pages")).toBeTruthy();
    expect(screen.getByText("CHF 5.10")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Registered" }));
    expect(screen.getByText("Registered · 2 pages")).toBeTruthy();
    expect(screen.getByText("CHF 9.33")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/pricing-simulator.runtime.test.ts'
```

Expected: FAIL because `PricingSimulator` and the new primitives do not exist yet.

- [ ] **Step 3: Add the dependency and write the minimal simulator**

Run:

```bash
cd /home/sam/dev/swiss-mail && npm install -w frontend @radix-ui/react-toggle-group
```

Implement the primitives and simulator:

```tsx
// frontend/src/components/ui/toggle-group.tsx
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

export const ToggleGroup = ToggleGroupPrimitive.Root;
export const ToggleGroupItem = ToggleGroupPrimitive.Item;
```

```tsx
// frontend/src/components/ui/input.tsx
import * as React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={
        "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 " +
        (className ?? "")
      }
      {...props}
    />
  ),
);
```

```tsx
// frontend/src/components/marketing/PricingSimulator.tsx
const [deliveryType, setDeliveryType] = React.useState<"standard" | "registered">(
  "standard",
);
const [pageCount, setPageCount] = React.useState(1);

const selectedExamples =
  deliveryType === "standard"
    ? provider.pageCountExamples.standard
    : provider.pageCountExamples.registered;
const selectedExample = getExampleForPageCount(selectedExamples, pageCount);
const bounds = getPageBounds(selectedExamples);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/pricing-simulator.runtime.test.ts'
```

Expected: PASS with the simulator reacting to both the stepper and the letter-type toggle.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json package-lock.json frontend/src/components/ui/toggle-group.tsx frontend/src/components/ui/input.tsx frontend/src/components/marketing/PricingSimulator.tsx frontend/tests/pricing-simulator.runtime.test.ts
git commit -m "feat: add pricing simulator controls" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Replace the old examples block and unify page alignment

**Files:**

- Modify: `frontend/src/components/marketing/PricingTiers.tsx`
- Modify: `frontend/src/components/marketing/pricing-shared.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Modify: `docs/03-ux/page-specifications-part-01.md`
- Modify Test: `frontend/tests/pricing-page.test.ts`

- [ ] **Step 1: Update the failing integration contract**

```ts
it("renders a pricing simulator instead of the old examples table", () => {
  const markup = renderPricingSections();

  expect(markup).toContain("Pricing simulator");
  expect(markup).toContain("Standard · 1 page");
  expect(markup).toContain("Each additional page");
  expect(markup).not.toContain("Price examples by page count");
  expect(markup).not.toContain("<table");
});

it("keeps every pricing label/value row on one baseline-aligned layout", () => {
  expect(pricingTiersSource).toContain("grid-cols-[minmax(0,1fr)_auto]");
  expect(pricingTiersSource).toContain("items-baseline");
  expect(pricingTiersSource).toContain("PricingSimulator");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/pricing-page.test.ts'
```

Expected: FAIL because `PricingTiers.tsx` still renders the old examples card and does not wire the simulator.

- [ ] **Step 3: Write the minimal integration code**

Create a shared alignment row and wire the simulator into the page:

```tsx
// frontend/src/components/marketing/pricing-shared.tsx
export function PricingValueRow({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
      <span className="min-w-0 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
        {label}
      </span>
      <span className="shrink-0 text-right text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </span>
    </div>
  );
}
```

```tsx
// frontend/src/components/marketing/PricingTiers.tsx
<PricingTotalsCard ... />
{provider ? (
  <PricingSimulator
    loading={loading}
    provider={provider}
    registeredSurchargeDisplayPrice={registeredSurchargeDisplayPrice}
    t={t}
  />
) : null}
```

Add the simulator copy keys to every locale file:

```json
"simulatorTitle": "Pricing simulator",
"letterTypeLabel": "Letter type",
"pagesLabel": "Pages",
"increasePagesLabel": "Increase pages",
"decreasePagesLabel": "Decrease pages",
"pageSingular": "page",
"pagePlural": "pages"
```

- [ ] **Step 4: Run the targeted tests until they pass**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/pricing-page.test.ts frontend/tests/pricing-simulator.runtime.test.ts frontend/tests/pricing-calculations.test.ts'
```

Expected: PASS with the simulator replacing the old examples block and the alignment assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/marketing/PricingTiers.tsx frontend/src/components/marketing/pricing-shared.tsx frontend/src/messages/en-CH.json frontend/src/messages/de-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json docs/03-ux/page-specifications-part-01.md frontend/tests/pricing-page.test.ts
git commit -m "feat: replace pricing examples with simulator" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Verify the page visually and across the repo

**Files:**

- No new source files expected

- [ ] **Step 1: Run the full repo checks**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run lint && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run typecheck && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run build'
```

Expected: PASS for lint, typecheck, tests, and build.

- [ ] **Step 2: Start the built frontend locally for an audit**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail/frontend/.next/standalone/frontend && PORT=4010 HOSTNAME=127.0.0.1 NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4010 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test node server.js'
```

Expected: local server responds on `http://127.0.0.1:4010/en-CH/pricing`.

- [ ] **Step 3: Run a browser audit with mocked pricing data**

Audit checklist:

```text
- mobile width: 375px
- light theme: no document overflow, no body overflow
- dark theme: no document overflow, no body overflow
- simulator row: label and price share the same baseline
- included title/icons: readable and green in both themes
- not included title/icons: readable and red in both themes
- FAQ icon chips: readable in both themes
```

If the audit exposes a misalignment or contrast issue, fix it and rerun the targeted simulator tests before repeating the audit.

- [ ] **Step 4: Review the final copy for minimalism**

Check these concrete questions:

```text
- Does the simulator title need a paragraph? If not, remove it.
- Does any row explain what the control already shows? If yes, remove it.
- Does any paragraph still mention provider, sync, reference totals, or "how to read" instructions? If yes, remove it.
- Are the included / not included sections still clean after the simulator lands? If not, tighten them.
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/marketing frontend/src/components/ui frontend/tests docs/03-ux/page-specifications-part-01.md
git commit -m "refactor: align pricing page simulator layout" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
