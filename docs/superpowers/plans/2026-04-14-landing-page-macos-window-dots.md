# Landing-page macOS window dots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage mockup's hardcoded reversed traffic-light dots with a shared decorative macOS-style red/yellow/green component and lock the new treatment in tests.

**Architecture:** Add a tiny dedicated marketing component instead of growing `primitives.tsx`, wire `HomepageHero` to that component, and update the existing source-level homepage regression test to assert the shared component usage plus the standard macOS colors and order. Keep the change decorative-only and scoped to the landing-page mockup chrome.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Vitest, ESLint

---

## File map

- `frontend/src/components/marketing/MarketingWindowDots.tsx` — new single-purpose decorative component that renders the standard macOS traffic-light dots.
- `frontend/src/components/marketing/HomepageHero.tsx` — swap the paper mockup's hardcoded dot spans for the shared component.
- `frontend/tests/marketing-homepage.test.ts` — update the source-level regression coverage so it expects the shared component and the standard red/yellow/green macOS palette.

## Execution notes

- Work directly on `main` for this repository; do not create a worktree or feature branch.
- Keep the change scoped to the marketing hero mockup. Do not redesign surrounding spacing, borders, or copy.
- `primitives.tsx` is already near the repo target size, so keep the new dot component in its own file.

### Task 1: Shared macOS mockup dots

**Files:**

- Create: `frontend/src/components/marketing/MarketingWindowDots.tsx`
- Modify: `frontend/src/components/marketing/HomepageHero.tsx:1-4,99-104`
- Test: `frontend/tests/marketing-homepage.test.ts:168-180,395-406`

- [ ] **Step 1: Write the failing test**

```ts
const homepageComponentPaths = {
  hero: path.join(repoRoot, "frontend/src/components/marketing/HomepageHero.tsx"),
  windowDots: path.join(
    repoRoot,
    "frontend/src/components/marketing/MarketingWindowDots.tsx",
  ),
  trustStrip: path.join(repoRoot, "frontend/src/components/marketing/TrustStrip.tsx"),
  howItWorks: path.join(
    repoRoot,
    "frontend/src/components/marketing/HowItWorksSteps.tsx",
  ),
  confidence: path.join(
    repoRoot,
    "frontend/src/components/marketing/ConfidenceBlock.tsx",
  ),
  useCases: path.join(repoRoot, "frontend/src/components/marketing/UseCaseGrid.tsx"),
} as const;

it("uses a shared macOS-style red yellow green window dots component in the hero paper mockup", () => {
  const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");
  const windowDotsSource = existsSync(homepageComponentPaths.windowDots)
    ? readFileSync(homepageComponentPaths.windowDots, "utf8")
    : "";

  const redIndex = windowDotsSource.indexOf("#FF5F57");
  const yellowIndex = windowDotsSource.indexOf("#FFBD2E");
  const greenIndex = windowDotsSource.indexOf("#28C840");

  expect(heroSource).toContain(
    'import { MarketingWindowDots } from "./MarketingWindowDots"',
  );
  expect(heroSource).toContain("<MarketingWindowDots />");
  expect(heroSource).not.toContain("bg-emerald-400/80");
  expect(heroSource).not.toContain("bg-amber-400/80");
  expect(heroSource).not.toContain("bg-rose-400/80");
  expect(redIndex).toBeGreaterThan(-1);
  expect(yellowIndex).toBeGreaterThan(-1);
  expect(greenIndex).toBeGreaterThan(-1);
  expect(redIndex).toBeLessThan(yellowIndex);
  expect(yellowIndex).toBeLessThan(greenIndex);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w frontend -- marketing-homepage.test.ts`  
Expected: FAIL in the new macOS window dots test because `MarketingWindowDots.tsx` does not exist yet and `HomepageHero.tsx` still hardcodes the old reversed palette.

- [ ] **Step 3: Write the minimal shared component**

```tsx
const MACOS_WINDOW_DOT_COLORS = ["#FF5F57", "#FFBD2E", "#28C840"] as const;

export function MarketingWindowDots() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2">
      {MACOS_WINDOW_DOT_COLORS.map((color) => (
        <span
          key={color}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Replace the hardcoded hero dots with the shared component**

```tsx
import { ArrowRight, FileText, MessageCircle, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingWindowDots } from "./MarketingWindowDots";
import { MarketingActionLink, MarketingBadge } from "./primitives";
import { MarketingBody, MarketingHeading, MarketingMeta } from "./typography";
```

```tsx
<div className="paper-noise rounded-[1.5rem] border border-amber-100/60 p-4 shadow-inner shadow-amber-200/35">
  <MarketingWindowDots />
  <div className="mt-4 h-3 w-28 rounded-full bg-zinc-300/75" />
  <div className="mt-4 space-y-2">
    <div className="h-2.5 w-full rounded-full bg-zinc-300/70" />
    <div className="h-2.5 w-[88%] rounded-full bg-zinc-300/70" />
    <div className="h-2.5 w-[82%] rounded-full bg-zinc-300/70" />
    <div className="h-2.5 w-[75%] rounded-full bg-zinc-300/70" />
  </div>
  <div className="mt-6 flex items-center justify-between gap-4">
    <div className="h-2.5 w-24 rounded-full bg-zinc-300/70" />
    <div className="h-7 w-20 rounded-full bg-amber-300/70" />
  </div>
  <div className="mt-2 h-2.5 w-16 rounded-full bg-zinc-400/70" />
</div>
```

- [ ] **Step 5: Run the targeted test to verify it passes**

Run: `npm run test -w frontend -- marketing-homepage.test.ts`  
Expected: PASS, including the new shared macOS red/yellow/green window dots assertion.

- [ ] **Step 6: Run frontend typecheck**

Run: `npm run typecheck -w frontend`  
Expected: PASS with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/marketing/MarketingWindowDots.tsx \
  frontend/src/components/marketing/HomepageHero.tsx \
  frontend/tests/marketing-homepage.test.ts
git commit -m "feat: share macos landing mockup dots" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Repo verification for the marketing mockup change

**Files:**

- Verify: `frontend/src/components/marketing/MarketingWindowDots.tsx`
- Verify: `frontend/src/components/marketing/HomepageHero.tsx`
- Verify: `frontend/tests/marketing-homepage.test.ts`

- [ ] **Step 1: Run the repository linter**

Run: `npm run lint`  
Expected: PASS with zero warnings.

- [ ] **Step 2: Run repository typecheck with frontend test env**

Run: `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run typecheck`  
Expected: PASS across the shared, backend, and frontend workspaces.

- [ ] **Step 3: Run repository tests with frontend test env**

Run: `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test`  
Expected: PASS.

- [ ] **Step 4: Run repository build with frontend test env**

Run: `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run build`  
Expected: PASS.
