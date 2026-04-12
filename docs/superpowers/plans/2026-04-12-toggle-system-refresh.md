# Shared Toggle System Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the recent draft-flow-only segmented toggle path with a shared shadcn/Radix-based toggle foundation, then migrate the compact toggle surfaces in scope so they are reusable, theme-safe, and visually consistent.

**Architecture:** Add one shadcn-derived toggle-group primitive in `frontend/src/components/ui/`, then compose a generic Swiss Mail app toggle wrapper on top of it. Migrate recipient/company, AI/manual, language, and theme onto that shared base while removing the old draft-flow-only `SegmentedControl` path.

**Tech Stack:** Next.js, React, TypeScript, next-intl, Vitest, @testing-library/react, Radix Toggle Group, Tailwind, existing Swiss Mail app tokens

---

## File map

- Modify: `frontend/package.json` — add `@radix-ui/react-toggle-group`.
- Modify: `package-lock.json` — lockfile update from the workspace install.
- Create: `frontend/src/components/ui/toggle-group.tsx` — shadcn-derived Radix primitive wrapper.
- Create: `frontend/src/components/ui/app-toggle-group.tsx` — generic Swiss Mail toggle wrapper with `segmented` and `theme` appearances.
- Modify: `frontend/src/components/product/draft-flow/cards.tsx` — remove the draft-flow-only `SegmentedControl`.
- Modify: `frontend/src/components/product/draft-flow/ui.tsx` — remove the `SegmentedControl` re-export.
- Modify: `frontend/src/components/product/draft-flow/RecipientForm.tsx` — switch company/person to the shared toggle.
- Modify: `frontend/src/components/product/draft-flow/BodyModeToolbar.tsx` — switch AI/manual to the shared toggle.
- Modify: `frontend/src/components/marketing/ThemeToggle.tsx` — rebuild theme toggle on the shared primitive while keeping the track/thumb appearance.
- Modify: `frontend/src/components/marketing/LanguageSwitcher.tsx` — move locale switching onto the shared segmented toggle.
- Test: `frontend/tests/shared-toggle-group.test.ts` — runtime behavior for the shared primitive/wrapper.
- Modify Test: `frontend/tests/toggle-contrast.test.ts`
- Modify Test: `frontend/tests/theme-provider-hydration.test.ts`
- Modify Test: `frontend/tests/button-system.test.ts`

---

### Task 1: Add the shared toggle foundation

**Files:**

- Modify: `frontend/package.json`
- Modify: `package-lock.json`
- Create: `frontend/src/components/ui/toggle-group.tsx`
- Create: `frontend/src/components/ui/app-toggle-group.tsx`
- Test: `frontend/tests/shared-toggle-group.test.ts`

- [ ] **Step 1: Write the failing runtime test**

```ts
// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppToggleGroup } from "../src/components/ui/app-toggle-group";

describe("AppToggleGroup", () => {
  it("renders segmented options and reports value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      React.createElement(AppToggleGroup, {
        ariaLabel: "Recipient mode",
        value: "person",
        variant: "segmented",
        onChange,
        options: [
          { value: "person", label: "Person" },
          { value: "company", label: "Company" },
        ],
      }),
    );

    await user.click(screen.getByRole("radio", { name: "Company" }));
    expect(onChange).toHaveBeenCalledWith("company");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/shared-toggle-group.test.ts'
```

Expected: FAIL because `app-toggle-group.tsx` and the Radix dependency do not exist yet.

- [ ] **Step 3: Add the dependency and implement the shared toggle files**

Run:

```bash
cd /home/sam/dev/swiss-mail && npm install -w frontend @radix-ui/react-toggle-group
```

Implement the shared base:

```tsx
// frontend/src/components/ui/toggle-group.tsx
import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cx("inline-flex items-center", className)}
    {...props}
  />
));

export const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item ref={ref} className={className} {...props} />
));
```

```tsx
// frontend/src/components/ui/app-toggle-group.tsx
import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

export function AppToggleGroup() {
  // concrete implementation added in the task
  return null;
}
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/shared-toggle-group.test.ts'
```

Expected: PASS with the new shared toggle runtime test green.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json package-lock.json frontend/src/components/ui/toggle-group.tsx frontend/src/components/ui/app-toggle-group.tsx frontend/tests/shared-toggle-group.test.ts
git commit -m "feat: add shared toggle foundation" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Migrate the draft-flow toggle surfaces

**Files:**

- Modify: `frontend/src/components/product/draft-flow/cards.tsx`
- Modify: `frontend/src/components/product/draft-flow/ui.tsx`
- Modify: `frontend/src/components/product/draft-flow/RecipientForm.tsx`
- Modify: `frontend/src/components/product/draft-flow/BodyModeToolbar.tsx`
- Modify Test: `frontend/tests/toggle-contrast.test.ts`

- [ ] **Step 1: Extend the failing regression test**

```ts
it("stops keeping the draft-flow segmented control as the active toggle implementation", () => {
  expect(cardsSource).not.toContain("export function SegmentedControl");
});
```

Add source assertions that `RecipientForm.tsx` and `BodyModeToolbar.tsx` import the shared app toggle component instead.

- [ ] **Step 2: Run the targeted regression test to verify it fails**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/toggle-contrast.test.ts'
```

Expected: FAIL because the draft-flow `SegmentedControl` still exists and the draft-flow files still use it.

- [ ] **Step 3: Migrate the draft-flow controls**

Implement the migration:

```tsx
// frontend/src/components/product/draft-flow/RecipientForm.tsx
import { AppToggleGroup } from "@/components/ui/app-toggle-group";
```

```tsx
<AppToggleGroup
  ariaLabel={t("recipientModeLabel")}
  variant="segmented"
  value={isCompany ? "company" : "person"}
  onChange={(value) => onCompanyModeChange(value === "company")}
  options={recipientModeOptions}
/>
```

Apply the same pattern to `BodyModeToolbar.tsx`, then remove the old `SegmentedControl` code and export plumbing from `cards.tsx` and `ui.tsx`.

- [ ] **Step 4: Run the targeted regression test to verify it passes**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/toggle-contrast.test.ts'
```

Expected: PASS with the draft-flow migration covered.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/product/draft-flow/cards.tsx frontend/src/components/product/draft-flow/ui.tsx frontend/src/components/product/draft-flow/RecipientForm.tsx frontend/src/components/product/draft-flow/BodyModeToolbar.tsx frontend/tests/toggle-contrast.test.ts
git commit -m "refactor: migrate draft flow toggles" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Migrate the theme and language toggles

**Files:**

- Modify: `frontend/src/components/marketing/ThemeToggle.tsx`
- Modify: `frontend/src/components/marketing/LanguageSwitcher.tsx`
- Modify Test: `frontend/tests/theme-provider-hydration.test.ts`
- Modify Test: `frontend/tests/button-system.test.ts`
- Modify Test: `frontend/tests/toggle-contrast.test.ts`

- [ ] **Step 1: Write/extend the failing tests**

Add assertions that:

- `ThemeToggle` uses the shared app toggle component rather than a custom button-only implementation.
- `LanguageSwitcher` still renders the current locale as active, but now drives selection through the shared toggle system.
- Theme switching still updates the theme provider state correctly.

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/theme-provider-hydration.test.ts frontend/tests/button-system.test.ts frontend/tests/toggle-contrast.test.ts'
```

Expected: FAIL because both marketing toggles still use separate bespoke implementations.

- [ ] **Step 3: Migrate the theme and language toggle components**

Implement the migration:

```tsx
// frontend/src/components/marketing/ThemeToggle.tsx
const options = [
  { value: "light", label: t("themeLight"), icon: <Sun className="h-3.5 w-3.5" /> },
  { value: "dark", label: t("themeDark"), icon: <Moon className="h-3.5 w-3.5" /> },
] as const;
```

```tsx
<AppToggleGroup
  ariaLabel={t("theme")}
  variant="theme"
  value={theme}
  onChange={(value) => setTheme(value)}
  options={options}
/>
```

```tsx
// frontend/src/components/marketing/LanguageSwitcher.tsx
const router = useRouter();
```

```tsx
<AppToggleGroup
  ariaLabel={t("language")}
  variant="segmented"
  value={locale}
  onChange={(nextLocale) => router.replace(pathname, { locale: nextLocale })}
  options={routing.locales.map((value) => ({
    value,
    label: value.split("-")[0]?.toUpperCase() ?? value,
  }))}
/>
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test -- frontend/tests/theme-provider-hydration.test.ts frontend/tests/button-system.test.ts frontend/tests/toggle-contrast.test.ts frontend/tests/shared-toggle-group.test.ts'
```

Expected: PASS with the shared toggle system covering theme and language.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/marketing/ThemeToggle.tsx frontend/src/components/marketing/LanguageSwitcher.tsx frontend/tests/theme-provider-hydration.test.ts frontend/tests/button-system.test.ts frontend/tests/toggle-contrast.test.ts
git commit -m "refactor: unify marketing toggles" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Verify the full refactor

**Files:**

- Test: repo root verification scripts

- [ ] **Step 1: Run lint**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run lint'
```

Expected: PASS

- [ ] **Step 2: Run typecheck**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run typecheck'
```

Expected: PASS

- [ ] **Step 3: Run tests**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test'
```

Expected: PASS

- [ ] **Step 4: Run build**

Run:

```bash
npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && NEXT_PUBLIC_SITE_URL=http://localhost:5000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run build'
```

Expected: PASS

- [ ] **Step 5: Commit the completed refactor**

```bash
git add frontend package-lock.json
git commit -m "refactor: refresh shared toggle system" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
