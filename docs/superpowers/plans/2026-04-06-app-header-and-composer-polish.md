# App Header and Composer Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify customer-facing header language/menu behavior and fix prompt composer shortcut, loading, and CTA-copy regressions without touching admin flows.

**Architecture:** Introduce small shared header controls instead of repeating locale/menu logic across marketing and draft pages. Keep the prompt-fitting and body-loading fixes in pure helpers where possible so the UI stays thin and the regressions are locked down with focused Vitest coverage.

**Tech Stack:** Next.js, React, TypeScript, next-intl, Radix Popover/Sheet, Vitest

---

## File Map

- Create: `frontend/src/components/layout/HeaderLanguageMenu.tsx` — desktop header locale dropdown built on the existing popover primitive.
- Create: `frontend/src/components/layout/CustomerSiteMenu.tsx` — shared menu trigger + sheet wrapper for customer-facing headers that need the mobile title + hamburger contract.
- Create: `frontend/src/components/product/draft-flow/useMeasuredPromptShortcutLayout.ts` — DOM-measurement hook that feeds the pure shortcut layout helper.
- Create: `frontend/src/components/product/draft-flow/body-loading-state.ts` — pure helper for initial-draft vs refinement loading flags.
- Create: `frontend/tests/header-language-menu.test.ts` — regression test for the new dropdown control.
- Create: `frontend/tests/customer-header-contract.test.ts` — regression test for shared customer-facing header wiring.
- Create: `frontend/tests/body-loading-state.test.ts` — pure-logic test for the body-step loading split.
- Create: `frontend/tests/draft-composer-loading.test.ts` — spinner-vs-arrow render regression.
- Create: `frontend/tests/draft-step-copy.test.ts` — locale-copy regression for short CTA labels.
- Modify: `frontend/src/components/marketing/Header.tsx` — swap desktop locale pills for the shared dropdown.
- Modify: `frontend/src/components/product/FlowHeader.tsx` — replace inline locale controls with desktop dropdown + shared menu trigger.
- Modify: `frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx` — delegate to the shared customer site menu.
- Modify: `frontend/src/components/product/draft-flow/draft-shell.tsx` — place the shared desktop locale dropdown in the draft workspace header.
- Modify: `frontend/src/app/[locale]/draft/new/page.tsx` — replace `EntryHeader` inline locale pills with the shared header controls.
- Modify: `frontend/src/app/[locale]/status/[orderToken]/page.tsx` — adopt the shared customer-facing header contract.
- Modify: `frontend/src/components/product/draft-flow/prompt-shortcut-layout.ts` — width-aware overflow algorithm with reserved `More` width.
- Modify: `frontend/src/components/product/draft-flow/PromptShortcutBar.tsx` — strict single-line row, measurement refs, and `More`-only placeholder state before measurement.
- Modify: `frontend/src/components/product/draft-flow/BodyStep.tsx` — separate initial auto-compose loading from refinement loading.
- Modify: `frontend/src/components/product/draft-flow/draft-composer.tsx` — render only the spinner or the arrow, never both.
- Modify: `frontend/src/messages/en-CH.json` — short English draft-step CTA labels.
- Modify: `frontend/src/messages/de-CH.json` — short German draft-step CTA labels.
- Modify: `frontend/src/messages/fr-CH.json` — short French draft-step CTA labels.
- Modify: `frontend/src/messages/it-CH.json` — short Italian draft-step CTA labels.
- Modify: `frontend/tests/prompt-shortcut-layout.test.ts` — assert width-aware fitting rather than fixed compact counts.
- Modify: `frontend/tests/prompt-shortcut-ui.test.ts` — assert the row stays single-line and measurement-driven.
- Modify: `frontend/tests/body-generation-dialog.test.ts` — assert `BodyStep` now imports the loading-state helper.

### Task 1: HeaderLanguageMenu primitive

**Files:**
- Create: `frontend/src/components/layout/HeaderLanguageMenu.tsx`
- Test: `frontend/tests/header-language-menu.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const headerLanguageMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/HeaderLanguageMenu.tsx"),
  "utf8",
);

describe("header language menu", () => {
  it("uses a compact popover trigger instead of the pill-strip selector", () => {
    expect(headerLanguageMenuSource).toContain('import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";');
    expect(headerLanguageMenuSource).toContain('aria-haspopup="listbox"');
    expect(headerLanguageMenuSource).toContain("routing.locales.map");
    expect(headerLanguageMenuSource).not.toContain("app-choice-pill");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/header-language-menu.test.ts`

Expected: FAIL with `ENOENT` because `frontend/src/components/layout/HeaderLanguageMenu.tsx` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { getAppButtonClassName } from "../ui/app-button";

export function HeaderLanguageMenu() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const activeLabel = useMemo(
    () => locale.split("-")[0]?.toUpperCase() ?? locale,
    [locale],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("language")}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={getAppButtonClassName({
            variant: "secondary",
            size: "md",
            className: "min-h-11 gap-2 rounded-full px-4 py-0",
          })}
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-semibold">{activeLabel}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2">
        <div role="listbox" aria-label={t("language")} className="space-y-1">
          {routing.locales.map((nextLocale) => {
            const label = nextLocale.split("-")[0]?.toUpperCase() ?? nextLocale;
            const isActive = nextLocale === locale;

            return (
              <Link
                key={nextLocale}
                href={pathname}
                locale={nextLocale}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-h-11 items-center justify-between rounded-2xl px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-amber-50 text-zinc-950 dark:bg-amber-400/15 dark:text-amber-100"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                ].join(" ")}
                onClick={() => setOpen(false)}
              >
                <span>{label}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{nextLocale}</span>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/header-language-menu.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/HeaderLanguageMenu.tsx frontend/tests/header-language-menu.test.ts
git commit -m "feat(frontend): add header language menu"
```

### Task 2: Shared customer header menu wiring

**Files:**
- Create: `frontend/src/components/layout/CustomerSiteMenu.tsx`
- Modify: `frontend/src/components/marketing/Header.tsx`
- Modify: `frontend/src/components/product/FlowHeader.tsx`
- Modify: `frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx`
- Modify: `frontend/src/components/product/draft-flow/draft-shell.tsx`
- Modify: `frontend/src/app/[locale]/draft/new/page.tsx`
- Modify: `frontend/src/app/[locale]/status/[orderToken]/page.tsx`
- Test: `frontend/tests/customer-header-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const marketingHeaderSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/Header.tsx"),
  "utf8",
);
const flowHeaderSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/FlowHeader.tsx"),
  "utf8",
);
const workspaceMenuSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx"),
  "utf8",
);
const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);
const entryPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/new/page.tsx"),
  "utf8",
);
const statusPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/status/[orderToken]/page.tsx"),
  "utf8",
);

describe("customer header contract", () => {
  it("routes customer-facing headers through the shared desktop language menu and mobile site menu", () => {
    expect(marketingHeaderSource).toContain('import { HeaderLanguageMenu } from "../layout/HeaderLanguageMenu";');
    expect(marketingHeaderSource).toContain("<HeaderLanguageMenu");
    expect(flowHeaderSource).toContain("<CustomerSiteMenu");
    expect(flowHeaderSource).toContain("<HeaderLanguageMenu");
    expect(flowHeaderSource).not.toContain("CompactLanguageSwitcher");
    expect(workspaceMenuSource).toContain('from "../../layout/CustomerSiteMenu"');
    expect(draftShellSource).toContain("<HeaderLanguageMenu");
    expect(entryPageSource).toContain("<CustomerSiteMenu");
    expect(statusPageSource).toContain("<HeaderLanguageMenu");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/customer-header-contract.test.ts`

Expected: FAIL because `CustomerSiteMenu.tsx` does not exist and the affected headers still import `LanguageSwitcher` directly.

- [ ] **Step 3: Create the shared menu component**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MenuTriggerButton } from "./MenuTriggerButton";
import { SiteMenuPanel } from "./SiteMenuPanel";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "../ui/sheet";

interface CustomerSiteMenuProps {
  title: string;
  description: string;
  isCompactViewport?: boolean;
}

export function CustomerSiteMenu({
  title,
  description,
  isCompactViewport = false,
}: CustomerSiteMenuProps) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const headerPaddingClassName = isCompactViewport
    ? "px-6 pb-5 pt-5 sm:px-8"
    : "px-6 pb-5 pt-3 sm:px-8 lg:px-10";
  const bodyPaddingClassName = isCompactViewport
    ? "px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-8"
    : "px-6 pb-5 sm:px-8 lg:px-10";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex h-11 w-11 shrink-0 items-start justify-end">
        {!open ? (
          <MenuTriggerButton
            compact
            aria-label={tc("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          />
        ) : null}
      </div>
      <SheetContent
        side="right"
        className={getSheetSurfaceClassName("navigation")}
        aria-label="Navigation menu"
      >
        <div className={headerPaddingClassName}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {title}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </SheetDescription>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-start justify-end">
              <SheetClose asChild>
                <MenuTriggerButton compact isOpen aria-label={tc("closeMenu")} />
              </SheetClose>
            </div>
          </div>
        </div>
        <SheetBody className={bodyPaddingClassName}>
          <div className="border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
            <SiteMenuPanel onNavigate={() => setOpen(false)} />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Wire the shared controls into customer-facing headers**

```tsx
// frontend/src/components/marketing/Header.tsx
import { HeaderLanguageMenu } from "../layout/HeaderLanguageMenu";

// desktop controls
<div className="hidden md:block">
  <ThemeToggle compact />
</div>
<div className="hidden md:block">
  <HeaderLanguageMenu />
</div>
```

```tsx
// frontend/src/components/product/FlowHeader.tsx
import { HeaderLanguageMenu } from "../layout/HeaderLanguageMenu";
import { CustomerSiteMenu } from "../layout/CustomerSiteMenu";

// mobile: keep the top row to title + menu only, then render compact progress below it
<div className="sm:hidden">
  <div className="flex items-center justify-between gap-3">
    <Link
      href="/"
      className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-[11px] font-semibold uppercase tracking-widest text-white shadow-sm dark:bg-amber-400 dark:text-zinc-950">
        SM
      </span>
      <span>{tc("appName")}</span>
    </Link>
    <CustomerSiteMenu
      title={tc("appName")}
      description={t("nav.writeLetter")}
      isCompactViewport
    />
  </div>
  <div className="mt-3 min-w-0">
    <StepIndicator currentStep={currentStep} draftId={draftId} />
  </div>
</div>

// desktop
<div className="flex shrink-0 items-center gap-2 sm:gap-3">
  <HeaderLanguageMenu />
  <CustomerSiteMenu title={tc("appName")} description={t("nav.writeLetter")} />
</div>
```

```tsx
// frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx
import { CustomerSiteMenu } from "../../layout/CustomerSiteMenu";

export function WorkspaceSiteMenu({ isCompactViewport = false }: WorkspaceSiteMenuProps) {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");

  return (
    <CustomerSiteMenu
      title={tc("appName")}
      description={t("nav.writeLetter")}
      isCompactViewport={isCompactViewport}
    />
  );
}
```

```tsx
// frontend/src/components/product/draft-flow/draft-shell.tsx
import { HeaderLanguageMenu } from "../../layout/HeaderLanguageMenu";

// desktop header action cluster
<div className="flex items-center gap-2">
  <HeaderLanguageMenu />
  <WorkspaceSiteMenu isCompactViewport={false} />
</div>
```

```tsx
// frontend/src/app/[locale]/draft/new/page.tsx
import { HeaderLanguageMenu } from "../../../../components/layout/HeaderLanguageMenu";
import { CustomerSiteMenu } from "../../../../components/layout/CustomerSiteMenu";

function EntryHeader() {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] transition-colors">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="inline-flex min-w-0 items-center gap-3 text-sm font-semibold tracking-tight text-[var(--app-fg)]">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--action-primary-bg)] text-xs font-semibold uppercase tracking-widest text-[var(--action-primary-fg)] shadow-sm">
            SM
          </span>
          <span className="truncate">{tc("appName")}</span>
        </Link>

        <div className="hidden sm:block">
          <HeaderLanguageMenu />
        </div>
        <div className="sm:hidden">
          <CustomerSiteMenu title={tc("appName")} description={t("nav.writeLetter")} isCompactViewport />
        </div>
      </div>
    </header>
  );
}
```

```tsx
// frontend/src/app/[locale]/status/[orderToken]/page.tsx
import { HeaderLanguageMenu } from "../../../../components/layout/HeaderLanguageMenu";
import { CustomerSiteMenu } from "../../../../components/layout/CustomerSiteMenu";

// header row
<header className="border-b border-zinc-200/80 bg-white/95 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6">
  <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
    <Link href="/" className="inline-flex items-center gap-3 font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/80 bg-white text-xs shadow-sm dark:border-amber-500/30 dark:bg-zinc-900">
        SM
      </span>
      {tc("appName")}
    </Link>
    <div className="hidden sm:flex items-center gap-3">
      <HeaderLanguageMenu />
      <Link href="/draft/new" className="btn-primary px-4 py-2 text-sm">
        {t("sendAnother")}
      </Link>
    </div>
    <div className="sm:hidden">
      <CustomerSiteMenu title={tc("appName")} description={t("sendAnother")} isCompactViewport />
    </div>
  </div>
</header>
```

- [ ] **Step 5: Run the header tests**

Run: `npm test -- frontend/tests/header-language-menu.test.ts frontend/tests/customer-header-contract.test.ts frontend/tests/button-system.test.ts`

Expected: PASS with all three files green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/CustomerSiteMenu.tsx frontend/src/components/marketing/Header.tsx frontend/src/components/product/FlowHeader.tsx frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx frontend/src/components/product/draft-flow/draft-shell.tsx frontend/src/app/[locale]/draft/new/page.tsx frontend/src/app/[locale]/status/[orderToken]/page.tsx frontend/tests/customer-header-contract.test.ts
git commit -m "refactor(frontend): share customer header controls"
```

### Task 3: Measured prompt shortcut overflow

**Files:**
- Create: `frontend/src/components/product/draft-flow/useMeasuredPromptShortcutLayout.ts`
- Modify: `frontend/src/components/product/draft-flow/prompt-shortcut-layout.ts`
- Modify: `frontend/src/components/product/draft-flow/PromptShortcutBar.tsx`
- Test: `frontend/tests/prompt-shortcut-layout.test.ts`
- Test: `frontend/tests/prompt-shortcut-ui.test.ts`

- [ ] **Step 1: Rewrite the failing algorithm test around widths**

```ts
import { describe, expect, it } from "vitest";
import { resolvePromptShortcutLayout } from "../src/components/product/draft-flow/prompt-shortcut-layout";

const primaryShortcuts = [
  { id: "one", label: "One", prompt: "One", description: "One" },
  { id: "two", label: "Two", prompt: "Two", description: "Two" },
  { id: "three", label: "Three", prompt: "Three", description: "Three" },
];

describe("prompt shortcut layout", () => {
  it("reserves space for More before deciding the final visible shortcut count", () => {
    const layout = resolvePromptShortcutLayout({
      primaryShortcuts,
      overflowShortcuts: [],
      availableWidth: 180,
      leadingWidth: 0,
      moreWidth: 68,
      shortcutWidths: new Map([
        ["one", 52],
        ["two", 56],
        ["three", 64],
      ]),
      gap: 8,
    });

    expect(layout.visiblePrimaryShortcuts.map((shortcut) => shortcut.id)).toEqual(["one", "two"]);
    expect(layout.sheetShortcuts.map((shortcut) => shortcut.id)).toEqual(["three"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/prompt-shortcut-layout.test.ts`

Expected: FAIL because `resolvePromptShortcutLayout` does not accept width inputs yet.

- [ ] **Step 3: Update the pure layout helper**

```ts
interface ResolvePromptShortcutLayoutOptions<TShortcut extends PromptShortcutItem> {
  primaryShortcuts: readonly TShortcut[];
  overflowShortcuts: readonly TShortcut[];
  availableWidth: number;
  shortcutWidths: ReadonlyMap<string, number>;
  moreWidth: number;
  leadingWidth?: number;
  gap?: number;
}

export interface PromptShortcutLayoutResult<TShortcut extends PromptShortcutItem> {
  visiblePrimaryShortcuts: TShortcut[];
  sheetShortcuts: TShortcut[];
}

export function resolvePromptShortcutLayout<TShortcut extends PromptShortcutItem>({
  primaryShortcuts,
  overflowShortcuts,
  availableWidth,
  shortcutWidths,
  moreWidth,
  leadingWidth = 0,
  gap = 8,
}: ResolvePromptShortcutLayoutOptions<TShortcut>) {
  const visible: TShortcut[] = [];
  const deferred: TShortcut[] = [];
  let usedWidth = leadingWidth;

  for (let index = 0; index < primaryShortcuts.length; index += 1) {
    const shortcut = primaryShortcuts[index];
    const shortcutWidth = shortcutWidths.get(shortcut.id) ?? 0;
    const willNeedMore =
      index < primaryShortcuts.length - 1 || overflowShortcuts.length > 0;
    const nextUsedWidth =
      usedWidth + (visible.length > 0 || leadingWidth > 0 ? gap : 0) + shortcutWidth;
    const budget = availableWidth - (willNeedMore ? gap + moreWidth : 0);

    if (nextUsedWidth <= budget) {
      visible.push(shortcut);
      usedWidth = nextUsedWidth;
      continue;
    }

    deferred.push(...primaryShortcuts.slice(index));
    break;
  }

  return {
    visiblePrimaryShortcuts: visible,
    sheetShortcuts: [...deferred, ...overflowShortcuts],
  };
}
```

- [ ] **Step 4: Add the DOM-measurement hook**

```ts
"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { resolvePromptShortcutLayout, type PromptShortcutLayoutResult } from "./prompt-shortcut-layout";

export function useMeasuredPromptShortcutLayout<TShortcut extends { id: string }>(options: {
  primaryShortcuts: readonly TShortcut[];
  overflowShortcuts: readonly TShortcut[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLSpanElement>(null);
  const shortcutRefs = useRef(new Map<string, HTMLSpanElement>());
  const [availableWidth, setAvailableWidth] = useState(0);
  const [shortcutWidths, setShortcutWidths] = useState<Map<string, number>>(new Map());
  const [moreWidth, setMoreWidth] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      setAvailableWidth(container.clientWidth);
      setMoreWidth(moreRef.current?.offsetWidth ?? 0);
      setShortcutWidths(
        new Map(
          options.primaryShortcuts.map((shortcut) => [
            shortcut.id,
            shortcutRefs.current.get(shortcut.id)?.offsetWidth ?? 0,
          ]),
        ),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    shortcutRefs.current.forEach((node) => observer.observe(node));
    if (moreRef.current) observer.observe(moreRef.current);

    return () => observer.disconnect();
  }, [options.primaryShortcuts]);

  const hasMeasurements = availableWidth > 0 && moreWidth > 0;
  const layout: PromptShortcutLayoutResult<TShortcut> = useMemo(() => {
    if (!hasMeasurements) {
      return {
        visiblePrimaryShortcuts: [],
        sheetShortcuts: [...options.primaryShortcuts, ...options.overflowShortcuts],
      };
    }

    return resolvePromptShortcutLayout({
      primaryShortcuts: options.primaryShortcuts,
      overflowShortcuts: options.overflowShortcuts,
      availableWidth,
      shortcutWidths,
      moreWidth,
    });
  }, [availableWidth, hasMeasurements, moreWidth, options.overflowShortcuts, options.primaryShortcuts, shortcutWidths]);

  return { containerRef, moreRef, shortcutRefs, hasMeasurements, layout };
}
```

- [ ] **Step 5: Wire the hook into `PromptShortcutBar.tsx` and keep the row single-line**

```tsx
const { containerRef, moreRef, shortcutRefs, hasMeasurements, layout } =
  useMeasuredPromptShortcutLayout({
    primaryShortcuts,
    overflowShortcuts,
  });

const visiblePrimaryShortcuts = hasMeasurements
  ? layout.visiblePrimaryShortcuts
  : [];
const sheetShortcuts = hasMeasurements
  ? layout.sheetShortcuts
  : [...primaryShortcuts, ...overflowShortcuts];

<div
  aria-hidden="true"
  className="pointer-events-none absolute left-0 top-0 -z-10 flex opacity-0"
>
  {primaryShortcuts.map((shortcut) => (
    <span
      key={shortcut.id}
      ref={(node) => {
        if (node) shortcutRefs.current.set(shortcut.id, node);
      }}
      className="shrink-0"
    >
      <ComposerBadge className="whitespace-nowrap">{shortcut.label}</ComposerBadge>
    </span>
  ))}
  <span ref={moreRef} className="shrink-0">
    <ComposerBadge className="whitespace-nowrap">{moreLabel}</ComposerBadge>
  </span>
</div>

<div
  ref={containerRef}
  className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-hidden px-1 py-1"
  aria-label="Prompt shortcuts"
>
  {visiblePrimaryShortcuts.map((shortcut) => (
    <ComposerBadge
      key={shortcut.id}
      className="shrink-0 whitespace-nowrap"
      disabled={disabled}
      onClick={() => onShortcutSelect(shortcut)}
    >
      {shortcut.label}
    </ComposerBadge>
  ))}
  {sheetShortcuts.length > 0 ? (
    <ComposerBadge
      className="shrink-0 whitespace-nowrap"
      disabled={disabled}
      onClick={() => setShowShortcutSheet(true)}
    >
      {moreLabel}
    </ComposerBadge>
  ) : null}
</div>
```

- [ ] **Step 6: Update the UI regression**

```ts
it("keeps the inline shortcut row on one line and measures overflow instead of wrapping", () => {
  expect(promptShortcutBarSource).toContain('className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-hidden px-1 py-1"');
  expect(promptShortcutBarSource).toContain("useMeasuredPromptShortcutLayout");
  expect(promptShortcutBarSource).not.toContain('? "flex-wrap overflow-visible"');
});
```

- [ ] **Step 7: Run the shortcut tests**

Run: `npm test -- frontend/tests/prompt-shortcut-layout.test.ts frontend/tests/prompt-shortcut-ui.test.ts`

Expected: PASS with both test files green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/product/draft-flow/useMeasuredPromptShortcutLayout.ts frontend/src/components/product/draft-flow/prompt-shortcut-layout.ts frontend/src/components/product/draft-flow/PromptShortcutBar.tsx frontend/tests/prompt-shortcut-layout.test.ts frontend/tests/prompt-shortcut-ui.test.ts
git commit -m "fix(draft-flow): measure prompt shortcut overflow"
```

### Task 4: Body-step loading state separation

**Files:**
- Create: `frontend/src/components/product/draft-flow/body-loading-state.ts`
- Modify: `frontend/src/components/product/draft-flow/BodyStep.tsx`
- Modify: `frontend/tests/body-generation-dialog.test.ts`
- Test: `frontend/tests/body-loading-state.test.ts`

- [ ] **Step 1: Write the failing pure-state test**

```ts
import { describe, expect, it } from "vitest";
import { getBodyLoadingState } from "../src/components/product/draft-flow/body-loading-state";

describe("body loading state", () => {
  it("stops treating the first-draft flow as busy once body text exists", () => {
    expect(
      getBodyLoadingState({
        hasBody: true,
        initialComposeStatus: "idle",
        isAutoComposing: true,
        isSending: false,
        isStreaming: false,
        isAwaitingResponse: false,
      }),
    ).toEqual({
      isAiBusy: false,
      showBodyGenerationDialog: false,
      showRefinementLoadingCard: false,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/body-loading-state.test.ts`

Expected: FAIL with `ENOENT` because `body-loading-state.ts` does not exist yet.

- [ ] **Step 3: Create the pure loading helper**

```ts
export function getBodyLoadingState(options: {
  hasBody: boolean;
  initialComposeStatus: "idle" | "loading" | "error";
  isAutoComposing: boolean;
  isSending: boolean;
  isStreaming: boolean;
  isAwaitingResponse: boolean;
}) {
  const hasBody = options.hasBody;
  const refinementBusy =
    hasBody && (options.isSending || options.isStreaming || options.isAwaitingResponse);
  const initialDraftBusy =
    !hasBody && options.initialComposeStatus === "loading" && options.isAutoComposing;

  return {
    isAiBusy: initialDraftBusy || refinementBusy,
    showBodyGenerationDialog:
      !hasBody &&
      (options.initialComposeStatus === "loading" ||
        options.initialComposeStatus === "error"),
    showRefinementLoadingCard: refinementBusy,
  };
}
```

- [ ] **Step 4: Wire `BodyStep.tsx` through the helper and clear the stale auto-compose flag**

```tsx
import { getBodyLoadingState } from "./body-loading-state";

useEffect(() => {
  if (draft.data?.body?.trim()) {
    setIsAutoComposing(false);
    setInitialComposeStatus("idle");
    return;
  }

  if (!isAutoComposing) return;

  if (conversation.completionCount > completionCountAtComposeRef.current) {
    if (draft.isFetching || composeFromContext.isPending) return;
    setIsAutoComposing(false);
    setInitialComposeStatus("error");
    return;
  }

  if (composeFromContext.isError || conversation.error) {
    setIsAutoComposing(false);
    setInitialComposeStatus("error");
  }
}, [composeFromContext.isError, composeFromContext.isPending, conversation.completionCount, conversation.error, draft.data?.body, draft.isFetching, isAutoComposing]);

const loadingState = getBodyLoadingState({
  hasBody: canProceed,
  initialComposeStatus,
  isAutoComposing,
  isSending: conversation.isSending,
  isStreaming: conversation.isStreaming,
  isAwaitingResponse: conversation.isAwaitingResponse,
});

const isAiBusy = loadingState.isAiBusy;
const shouldShowBodyGenerationDialog = loadingState.showBodyGenerationDialog;
```

- [ ] **Step 5: Update the dialog regression to lock the helper in place**

```ts
it("routes body-step loading through the extracted helper instead of ad-hoc inline flags", () => {
  expect(bodyStepSource).toContain('import { getBodyLoadingState } from "./body-loading-state";');
  expect(bodyStepSource).toContain("const loadingState = getBodyLoadingState({");
  expect(bodyStepSource).toContain("const shouldShowBodyGenerationDialog = loadingState.showBodyGenerationDialog;");
});
```

- [ ] **Step 6: Run the loading tests**

Run: `npm test -- frontend/tests/body-loading-state.test.ts frontend/tests/body-generation-dialog.test.ts`

Expected: PASS with both files green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/product/draft-flow/body-loading-state.ts frontend/src/components/product/draft-flow/BodyStep.tsx frontend/tests/body-loading-state.test.ts frontend/tests/body-generation-dialog.test.ts
git commit -m "fix(draft-flow): clear first-draft loading state"
```

### Task 5: Composer spinner/arrow toggle

**Files:**
- Modify: `frontend/src/components/product/draft-flow/draft-composer.tsx`
- Test: `frontend/tests/draft-composer-loading.test.ts`

- [ ] **Step 1: Write the failing render regression**

```ts
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftComposer } from "../src/components/product/draft-flow/draft-composer";

describe("draft composer loading affordance", () => {
  it("shows the spinner without the arrow while sending", () => {
    const markup = renderToStaticMarkup(
      createElement(DraftComposer, {
        placeholder: "Refine",
        value: "Tighten the closing",
        isSending: true,
      }),
    );

    expect(markup).toContain("animate-spin");
    expect(markup).not.toContain("lucide-arrow-up");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/draft-composer-loading.test.ts`

Expected: FAIL because the current markup still renders the arrow child alongside the loading spinner.

- [ ] **Step 3: Update `DraftComposer` to use a leading icon instead of a child icon**

```tsx
<AppButton
  onMouseDown={(event) => {
    event.preventDefault();
  }}
  onClick={handleSend}
  loading={isSending}
  disabled={!canSend && !isSending}
  variant={canSend || isSending ? "primary" : "secondary"}
  size="icon"
  className={canSend ? "scale-105" : "shadow-none"}
  leadingIcon={!isSending ? <ArrowUp className="h-5 w-5" /> : undefined}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/tests/draft-composer-loading.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/product/draft-flow/draft-composer.tsx frontend/tests/draft-composer-loading.test.ts
git commit -m "fix(draft-flow): toggle composer loading icon"
```

### Task 6: Compact localized CTA copy and final verification

**Files:**
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Test: `frontend/tests/draft-step-copy.test.ts`

- [ ] **Step 1: Write the failing locale-copy regression**

```ts
import en from "../src/messages/en-CH.json";
import de from "../src/messages/de-CH.json";
import fr from "../src/messages/fr-CH.json";
import it from "../src/messages/it-CH.json";
import { describe, expect, it } from "vitest";

describe("draft step CTA copy", () => {
  it("keeps the bottom primary actions short on narrow viewports", () => {
    expect(en.draft.continueToSender).toBe("Next: sender");
    expect(en.draft.continueToRecipient).toBe("Next: recipient");
    expect(en.draft.continueToContent).toBe("Next: content");
    expect(en.draft.continueToAttachments).toBe("Next: attachments");
    expect(en.draft.continueToSubject).toBe("Next: subject");
    expect(en.draft.continueToLogistics).toBe("Next: delivery");

    expect(de.draft.continueToSender).toBe("Weiter: Absender");
    expect(de.draft.continueToRecipient).toBe("Weiter: Empfänger");
    expect(de.draft.continueToContent).toBe("Weiter: Text");
    expect(de.draft.continueToAttachments).toBe("Weiter: Beilagen");
    expect(de.draft.continueToSubject).toBe("Weiter: Betreff");
    expect(de.draft.continueToLogistics).toBe("Weiter: Versand");

    expect(fr.draft.continueToSender).toBe("Suivant : expéditeur");
    expect(fr.draft.continueToRecipient).toBe("Suivant : destinataire");
    expect(fr.draft.continueToContent).toBe("Suivant : contenu");
    expect(fr.draft.continueToAttachments).toBe("Suivant : pièces jointes");
    expect(fr.draft.continueToSubject).toBe("Suivant : objet");
    expect(fr.draft.continueToLogistics).toBe("Suivant : envoi");

    expect(it.draft.continueToSender).toBe("Avanti: mittente");
    expect(it.draft.continueToRecipient).toBe("Avanti: destinatario");
    expect(it.draft.continueToContent).toBe("Avanti: contenuto");
    expect(it.draft.continueToAttachments).toBe("Avanti: allegati");
    expect(it.draft.continueToSubject).toBe("Avanti: oggetto");
    expect(it.draft.continueToLogistics).toBe("Avanti: spedizione");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/tests/draft-step-copy.test.ts`

Expected: FAIL because the locale files still contain the longer continue-label values.

- [ ] **Step 3: Update the locale strings**

```json
// frontend/src/messages/en-CH.json
{
  "continueToSender": "Next: sender",
  "continueToRecipient": "Next: recipient",
  "continueToContent": "Next: content",
  "continueToAttachments": "Next: attachments",
  "continueToSubject": "Next: subject",
  "continueToLogistics": "Next: delivery"
}
```

```json
// frontend/src/messages/de-CH.json
{
  "continueToSender": "Weiter: Absender",
  "continueToRecipient": "Weiter: Empfänger",
  "continueToContent": "Weiter: Text",
  "continueToAttachments": "Weiter: Beilagen",
  "continueToSubject": "Weiter: Betreff",
  "continueToLogistics": "Weiter: Versand"
}
```

```json
// frontend/src/messages/fr-CH.json
{
  "continueToSender": "Suivant : expéditeur",
  "continueToRecipient": "Suivant : destinataire",
  "continueToContent": "Suivant : contenu",
  "continueToAttachments": "Suivant : pièces jointes",
  "continueToSubject": "Suivant : objet",
  "continueToLogistics": "Suivant : envoi"
}
```

```json
// frontend/src/messages/it-CH.json
{
  "continueToSender": "Avanti: mittente",
  "continueToRecipient": "Avanti: destinatario",
  "continueToContent": "Avanti: contenuto",
  "continueToAttachments": "Avanti: allegati",
  "continueToSubject": "Avanti: oggetto",
  "continueToLogistics": "Avanti: spedizione"
}
```

- [ ] **Step 4: Run the locale-copy regression**

Run: `npm test -- frontend/tests/draft-step-copy.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Run targeted verification for the full slice**

Run: `npm test -- frontend/tests/header-language-menu.test.ts frontend/tests/customer-header-contract.test.ts frontend/tests/prompt-shortcut-layout.test.ts frontend/tests/prompt-shortcut-ui.test.ts frontend/tests/body-loading-state.test.ts frontend/tests/body-generation-dialog.test.ts frontend/tests/draft-composer-loading.test.ts frontend/tests/draft-step-copy.test.ts`

Expected: PASS with all listed files green.

- [ ] **Step 6: Run repo-wide verification**

Run: `npm run typecheck && npm test && npm run lint`

Expected: all three commands exit successfully.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/messages/en-CH.json frontend/src/messages/de-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json frontend/tests/draft-step-copy.test.ts
git commit -m "fix(i18n): shorten draft step cta copy"
```
