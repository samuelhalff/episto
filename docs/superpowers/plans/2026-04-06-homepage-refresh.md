# Homepage Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the homepage into a trust-first premium marketing page, standardize icon/spacing treatment, switch the shared marketing CTA band to the primary yellow family, and add reusable SEO plumbing for current marketing routes.

**Architecture:** Keep the implementation split between reusable marketing primitives and homepage-specific sections. Add one shared SEO helper for locale-aware metadata, sitemap URLs, JSON-LD, and noindex metadata, then wire current marketing routes through it while keeping provider claims and non-marketing scope unchanged.

**Tech Stack:** Next.js App Router, TypeScript, next-intl, Tailwind CSS, Vitest

---

## File map

- **Create:** `frontend/src/lib/marketing-seo.ts` — canonical site URL, locale alternates, marketing metadata builder, JSON-LD builders, shared noindex metadata
- **Create:** `frontend/src/components/marketing/JsonLd.tsx` — tiny JSON-LD script wrapper for marketing pages
- **Create:** `frontend/src/components/marketing/MarketingIconToken.tsx` — shared padded icon token for trust and feature sections
- **Create:** `frontend/src/components/marketing/HomepageHero.tsx` — split hero with proof line and product panel
- **Create:** `frontend/src/components/marketing/TrustStrip.tsx` — quiet trust band below the hero
- **Create:** `frontend/src/components/marketing/HowItWorksSteps.tsx` — shared 3-step marketing card section
- **Create:** `frontend/src/components/marketing/ConfidenceBlock.tsx` — 3-card value block
- **Create:** `frontend/src/components/marketing/UseCaseGrid.tsx` — use-case cards with short descriptions
- **Create:** `frontend/src/app/[locale]/draft/layout.tsx` — noindex metadata for draft routes
- **Create:** `frontend/src/app/[locale]/resume/layout.tsx` — noindex metadata for resume routes
- **Create:** `frontend/src/app/[locale]/status/layout.tsx` — noindex metadata for order-status routes
- **Create:** `frontend/src/app/[locale]/admin/AdminLayoutClient.tsx` — client-only wrapper moved out of the server layout so admin can export metadata
- **Create:** `frontend/tests/marketing-seo.test.ts` — metadata, sitemap, JSON-LD, and noindex regressions
- **Create:** `frontend/tests/marketing-homepage.test.ts` — homepage composition, spacing, icon token, CTA color, and locale-copy regressions
- **Modify:** `frontend/src/app/layout.tsx:15-21` — switch the fallback `metadataBase` to the public site URL
- **Modify:** `frontend/src/app/sitemap.ts:1-30` — reuse the shared site URL helper and keep sitemap scope to marketing routes
- **Modify:** `frontend/src/app/[locale]/admin/layout.tsx:1-13` — convert to server layout that wraps a new client component and exports noindex metadata
- **Modify:** `frontend/src/app/[locale]/page.tsx:1-291` — compose the new homepage sections, render JSON-LD, and export route metadata
- **Modify:** `frontend/src/app/[locale]/pricing/page.tsx:1-25` — export page metadata and add service JSON-LD
- **Modify:** `frontend/src/app/[locale]/help/page.tsx:1-109` — export page metadata and add FAQ JSON-LD
- **Modify:** `frontend/src/app/[locale]/privacy/page.tsx:1-47` — export page metadata
- **Modify:** `frontend/src/app/[locale]/terms/page.tsx:1-47` — export page metadata
- **Modify:** `frontend/src/app/[locale]/imprint/page.tsx:1-76` — export page metadata
- **Modify:** `frontend/src/components/marketing/primitives.tsx:8-135` — standardize marketing section rhythm
- **Modify:** `frontend/src/components/marketing/FinalCTABand.tsx:1-54` — dark text treatment on the yellow band
- **Modify:** `frontend/src/app/globals.css:22-24,50-52,342-354` — update the shared CTA band background and shadow
- **Modify:** `frontend/src/messages/de-CH.json:42-70`
- **Modify:** `frontend/src/messages/en-CH.json:42-70`
- **Modify:** `frontend/src/messages/fr-CH.json:42-70`
- **Modify:** `frontend/src/messages/it-CH.json:42-70`

---

### Task 1: Build reusable marketing SEO plumbing and noindex boundaries

**Files:**
- Create: `frontend/src/lib/marketing-seo.ts`
- Create: `frontend/src/components/marketing/JsonLd.tsx`
- Create: `frontend/src/app/[locale]/draft/layout.tsx`
- Create: `frontend/src/app/[locale]/resume/layout.tsx`
- Create: `frontend/src/app/[locale]/status/layout.tsx`
- Create: `frontend/src/app/[locale]/admin/AdminLayoutClient.tsx`
- Create: `frontend/tests/marketing-seo.test.ts`
- Modify: `frontend/src/app/layout.tsx:15-21`
- Modify: `frontend/src/app/sitemap.ts:1-30`
- Modify: `frontend/src/app/[locale]/admin/layout.tsx:1-13`

- [ ] **Step 1: Write the failing SEO foundation test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import sitemap from "../src/app/sitemap";
import { NO_INDEX_METADATA, buildMarketingMetadata } from "../src/lib/marketing-seo";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const adminLayoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/admin/layout.tsx"),
  "utf8",
);
const draftLayoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/layout.tsx"),
  "utf8",
);
const resumeLayoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/resume/layout.tsx"),
  "utf8",
);
const statusLayoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/status/layout.tsx"),
  "utf8",
);

describe("marketing SEO foundation", () => {
  it("builds a canonical URL and hreflang alternates from locale + pathname", () => {
    const metadata = buildMarketingMetadata({
      locale: "en-CH",
      pathname: "/pricing",
      title: "Pricing — Swiss Mail",
      description: "Transparent pricing for formal letters in Switzerland.",
    });

    expect(metadata.metadataBase?.toString()).toBe("https://swissmail.ch/");
    expect(metadata.alternates?.canonical).toBe("https://swissmail.ch/en-CH/pricing");
    expect(metadata.alternates?.languages?.["de-CH"]).toBe("https://swissmail.ch/de-CH/pricing");
    expect(metadata.alternates?.languages?.["fr-CH"]).toBe("https://swissmail.ch/fr-CH/pricing");
    expect(metadata.openGraph?.url).toBe("https://swissmail.ch/en-CH/pricing");
  });

  it("uses one shared noindex metadata object for non-marketing surfaces", () => {
    expect(NO_INDEX_METADATA.robots).toEqual({ index: false, follow: false });
    expect(adminLayoutSource).toContain("NO_INDEX_METADATA");
    expect(draftLayoutSource).toContain("NO_INDEX_METADATA");
    expect(resumeLayoutSource).toContain("NO_INDEX_METADATA");
    expect(statusLayoutSource).toContain("NO_INDEX_METADATA");
  });

  it("keeps only marketing routes in the sitemap", () => {
    const entries = sitemap();

    expect(entries.some((entry) => entry.url.endsWith("/de-CH"))).toBe(true);
    expect(entries.some((entry) => entry.url.endsWith("/en-CH/pricing"))).toBe(true);
    expect(entries.some((entry) => entry.url.endsWith("/fr-CH/help"))).toBe(true);
    expect(entries.every((entry) => !entry.url.includes("/draft/"))).toBe(true);
    expect(entries.every((entry) => !entry.url.includes("/admin/"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify the failure**

Run: `npm test -- frontend/tests/marketing-seo.test.ts`

Expected: FAIL with module/file errors for `../src/lib/marketing-seo`, `draft/layout.tsx`, `resume/layout.tsx`, or `status/layout.tsx`.

- [ ] **Step 3: Write the minimal SEO helper, JSON-LD wrapper, and noindex layouts**

```ts
// frontend/src/lib/marketing-seo.ts
import type { Metadata } from "next";
import { routing } from "../i18n/routing";

type Locale = (typeof routing.locales)[number];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://swissmail.ch";

export const NO_INDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
};

export function getSiteUrl() {
  return SITE_URL;
}

export function buildMarketingMetadata({
  locale,
  pathname,
  title,
  description,
}: {
  locale: Locale;
  pathname: string;
  title: string;
  description: string;
}): Metadata {
  const normalizedPath = pathname === "/" ? "" : pathname;
  const url = `${SITE_URL}/${locale}${normalizedPath}`;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        routing.locales.map((candidate) => [
          candidate,
          `${SITE_URL}/${candidate}${normalizedPath}`,
        ]),
      ),
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Swiss Mail",
    url: SITE_URL,
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Swiss Mail",
    url: SITE_URL,
  };
}

export function buildServiceJsonLd({
  locale,
  title,
  description,
}: {
  locale: Locale;
  title: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    description,
    areaServed: "CH",
    availableLanguage: locale,
    provider: {
      "@type": "Organization",
      name: "Swiss Mail",
      url: SITE_URL,
    },
  };
}

export function buildFaqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
```

```tsx
// frontend/src/components/marketing/JsonLd.tsx
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

```tsx
// frontend/src/app/[locale]/draft/layout.tsx
import type { ReactNode } from "react";
import { NO_INDEX_METADATA } from "../../../lib/marketing-seo";

export const metadata = NO_INDEX_METADATA;

export default function DraftLayout({ children }: { children: ReactNode }) {
  return children;
}
```

```tsx
// frontend/src/app/[locale]/resume/layout.tsx
import type { ReactNode } from "react";
import { NO_INDEX_METADATA } from "../../../lib/marketing-seo";

export const metadata = NO_INDEX_METADATA;

export default function ResumeLayout({ children }: { children: ReactNode }) {
  return children;
}
```

```tsx
// frontend/src/app/[locale]/status/layout.tsx
import type { ReactNode } from "react";
import { NO_INDEX_METADATA } from "../../../lib/marketing-seo";

export const metadata = NO_INDEX_METADATA;

export default function StatusLayout({ children }: { children: ReactNode }) {
  return children;
}
```

```tsx
// frontend/src/app/[locale]/admin/AdminLayoutClient.tsx
"use client";

import type { ReactNode } from "react";
import { AdminAuthProvider } from "./admin-auth-context";
import { AdminShell } from "./admin-shell";

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
```

```tsx
// frontend/src/app/[locale]/admin/layout.tsx
import type { ReactNode } from "react";
import { AdminLayoutClient } from "./AdminLayoutClient";
import { NO_INDEX_METADATA } from "../../../lib/marketing-seo";

export const metadata = NO_INDEX_METADATA;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
```

```ts
// frontend/src/app/layout.tsx
export const metadata: Metadata = {
  title: "Swiss Mail — Send formal letters via Swiss Post",
  description:
    "Draft and send formal letters via Swiss Post — quickly, securely, and professionally.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://swissmail.ch"),
  manifest: "/manifest.json",
};
```

```ts
// frontend/src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/marketing-seo";

const BASE_URL = getSiteUrl();
const LOCALES = ["de-CH", "fr-CH", "it-CH", "en-CH"] as const;
const STATIC_ROUTES = ["", "/pricing", "/help", "/privacy", "/terms", "/imprint"] as const;
```

- [ ] **Step 4: Run the test to verify the helper passes**

Run: `npm test -- frontend/tests/marketing-seo.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the SEO foundation**

```bash
git add frontend/src/lib/marketing-seo.ts frontend/src/components/marketing/JsonLd.tsx frontend/src/app/layout.tsx frontend/src/app/sitemap.ts frontend/src/app/[locale]/admin/layout.tsx frontend/src/app/[locale]/admin/AdminLayoutClient.tsx frontend/src/app/[locale]/draft/layout.tsx frontend/src/app/[locale]/resume/layout.tsx frontend/src/app/[locale]/status/layout.tsx frontend/tests/marketing-seo.test.ts
git commit -m "feat(frontend): add marketing seo foundation"
```

---

### Task 2: Standardize marketing spacing, icon padding, and CTA band styling

**Files:**
- Create: `frontend/src/components/marketing/MarketingIconToken.tsx`
- Create: `frontend/tests/marketing-homepage.test.ts`
- Modify: `frontend/src/components/marketing/primitives.tsx:8-135`
- Modify: `frontend/src/components/marketing/FinalCTABand.tsx:1-54`
- Modify: `frontend/src/app/globals.css:22-24,50-52,342-354`

- [ ] **Step 1: Write the failing visual-regression test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const globalsCssSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);
const primitivesSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/primitives.tsx"),
  "utf8",
);
const ctaBandSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/FinalCTABand.tsx"),
  "utf8",
);
const iconTokenSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/MarketingIconToken.tsx"),
  "utf8",
);

describe("marketing visual primitives", () => {
  it("keeps marketing sections on a shared vertical rhythm", () => {
    expect(primitivesSource).toContain("py-16");
    expect(primitivesSource).toContain("lg:py-24");
    expect(primitivesSource).not.toContain("lg:py-28");
  });

  it("renders padded icon tokens instead of cramped inline icon boxes", () => {
    expect(iconTokenSource).toContain("h-12 w-12");
    expect(iconTokenSource).toContain("rounded-full");
    expect(iconTokenSource).toContain("size-5");
  });

  it("uses the primary yellow family for the shared marketing CTA band", () => {
    expect(globalsCssSource).toContain(".marketing-cta-band");
    expect(globalsCssSource).toContain("var(--action-primary-bg)");
    expect(globalsCssSource).not.toContain("#b85c38");
    expect(ctaBandSource).toContain("text-zinc-950");
    expect(ctaBandSource).toContain("text-zinc-800/80");
  });
});
```

- [ ] **Step 2: Run the test to verify the failure**

Run: `npm test -- frontend/tests/marketing-homepage.test.ts`

Expected: FAIL because `MarketingIconToken.tsx` does not exist, `MarketingSection` still contains `lg:py-28`, and the CTA band still uses white text on the orange/amber gradient.

- [ ] **Step 3: Write the shared marketing primitives**

```tsx
// frontend/src/components/marketing/MarketingIconToken.tsx
import type { ReactNode } from "react";
import { cx } from "./primitives";

export function MarketingIconToken({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "primary" | "accent";
  className?: string;
}) {
  const toneClassName =
    tone === "primary"
      ? "bg-primary-light text-zinc-950"
      : tone === "accent"
        ? "bg-accent-light text-accent"
        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";

  return (
    <span
      className={cx(
        "inline-flex h-12 w-12 items-center justify-center rounded-full [&_svg]:size-5",
        toneClassName,
        className,
      )}
    >
      {children}
    </span>
  );
}
```

```tsx
// frontend/src/components/marketing/primitives.tsx
export function MarketingSection({
  children,
  className,
  contentClassName,
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  muted?: boolean;
}) {
  return (
    <section
      className={cx(
        "px-4 py-16 sm:px-6 lg:py-24",
        muted && "bg-[var(--app-surface-muted)]/55 dark:bg-zinc-900/35",
        className,
      )}
    >
      <div className={cx("mx-auto max-w-7xl", contentClassName)}>{children}</div>
    </section>
  );
}
```

```tsx
// frontend/src/components/marketing/FinalCTABand.tsx
{eyebrow ? <SectionLabel className="text-zinc-700/80">{eyebrow}</SectionLabel> : null}
<h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-zinc-950 md:text-5xl">
  {title}
</h2>
{body ? (
  <div className="mt-4 max-w-2xl text-sm leading-7 text-zinc-800/80 md:text-base">
    {body}
  </div>
) : null}
```

```css
/* frontend/src/app/globals.css */
.marketing-cta-band {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.24), transparent 34%),
    linear-gradient(135deg, var(--action-primary-bg) 0%, #fff4cc 100%);
  box-shadow: 0 28px 90px rgba(246, 197, 74, 0.22);
  color: #18181b;
}

.dark .marketing-cta-band {
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.16), transparent 36%),
    linear-gradient(135deg, #f6c54a 0%, #e9b93d 100%);
  box-shadow: 0 28px 90px rgba(246, 197, 74, 0.26);
  color: #111827;
}
```

- [ ] **Step 4: Run the visual-regression test**

Run: `npm test -- frontend/tests/marketing-homepage.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the shared marketing primitive update**

```bash
git add frontend/src/components/marketing/MarketingIconToken.tsx frontend/src/components/marketing/primitives.tsx frontend/src/components/marketing/FinalCTABand.tsx frontend/src/app/globals.css frontend/tests/marketing-homepage.test.ts
git commit -m "refactor(frontend): share marketing spacing and icon tokens"
```

---

### Task 3: Rebuild the homepage around focused trust-first sections and localized copy

**Files:**
- Create: `frontend/src/components/marketing/HomepageHero.tsx`
- Create: `frontend/src/components/marketing/TrustStrip.tsx`
- Create: `frontend/src/components/marketing/HowItWorksSteps.tsx`
- Create: `frontend/src/components/marketing/ConfidenceBlock.tsx`
- Create: `frontend/src/components/marketing/UseCaseGrid.tsx`
- Modify: `frontend/src/app/[locale]/page.tsx:1-291`
- Modify: `frontend/src/messages/de-CH.json:42-70`
- Modify: `frontend/src/messages/en-CH.json:42-70`
- Modify: `frontend/src/messages/fr-CH.json:42-70`
- Modify: `frontend/src/messages/it-CH.json:42-70`
- Test: `frontend/tests/marketing-homepage.test.ts`

- [ ] **Step 1: Extend the homepage regression test so it fails on the current layout**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const homePageSource = readFileSync(path.join(repoRoot, "frontend/src/app/[locale]/page.tsx"), "utf8");

describe("homepage trust-first composition", () => {
  it("composes the homepage from focused marketing sections", () => {
    expect(homePageSource).toContain('from "../../components/marketing/HomepageHero"');
    expect(homePageSource).toContain('from "../../components/marketing/TrustStrip"');
    expect(homePageSource).toContain('from "../../components/marketing/HowItWorksSteps"');
    expect(homePageSource).toContain('from "../../components/marketing/ConfidenceBlock"');
    expect(homePageSource).toContain('from "../../components/marketing/UseCaseGrid"');
    expect(homePageSource).toContain("<ConfidenceBlock");
  });

  it("adds explanatory trust/value/use-case copy in every locale", () => {
    for (const locale of [enCH, deCH, frCH, itCH]) {
      expect(locale.marketing.heroProof.length).toBeGreaterThan(10);
      expect(locale.marketing.confidenceTitle.length).toBeGreaterThan(10);
      expect(locale.marketing.confidenceCard1Title.length).toBeGreaterThan(3);
      expect(locale.marketing.useCaseCancelDescription.length).toBeGreaterThan(10);
      expect(locale.marketing.useCaseAuthorityDescription.length).toBeGreaterThan(10);
    }
  });
});
```

- [ ] **Step 2: Run the homepage regression test**

Run: `npm test -- frontend/tests/marketing-homepage.test.ts`

Expected: FAIL because the homepage still uses inline section components inside `page.tsx`, there is no confidence block, and the new copy keys do not exist in the locale files.

- [ ] **Step 3: Create the homepage sections and update the localized marketing copy**

```tsx
// frontend/src/components/marketing/HomepageHero.tsx
import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { MarketingActionLink, MarketingBadge, MarketingCard } from "./primitives";

export function HomepageHero({
  eyebrow,
  title,
  subtitle,
  proof,
  primaryLabel,
  secondaryLabel,
  panel,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  proof: string;
  primaryLabel: string;
  secondaryLabel: string;
  panel: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-14 sm:px-6 lg:pb-20 lg:pt-24">
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-x-4 top-0 -z-10 h-[72%] rounded-[2.5rem] opacity-30 md:inset-x-8 md:rounded-[3rem]" />
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <div className="animate-rise-in">
          <MarketingBadge className="text-zinc-600 dark:text-zinc-200">
            <Sparkles className="h-4 w-4" />
            {eyebrow}
          </MarketingBadge>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 md:text-lg md:leading-8">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <MarketingActionLink href="/draft/new" className="cta-sheen rounded-full text-base">
              {primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </MarketingActionLink>
            <MarketingActionLink href="/pricing" variant="secondary" className="rounded-full text-base">
              {secondaryLabel}
            </MarketingActionLink>
          </div>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{proof}</p>
        </div>
        <MarketingCard className="rounded-[2rem] p-5 md:p-7">{panel}</MarketingCard>
      </div>
    </section>
  );
}
```

```tsx
// frontend/src/components/marketing/TrustStrip.tsx
import type { ReactNode } from "react";
import { MarketingIconToken } from "./MarketingIconToken";

export function TrustStrip({
  items,
}: {
  items: Array<{ icon: ReactNode; label: string }>;
}) {
  return (
    <section className="border-y border-[var(--app-border)] bg-[var(--app-surface-muted)]/70 px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 sm:gap-6">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <MarketingIconToken className="[&_svg]:size-4">{item.icon}</MarketingIconToken>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// frontend/src/components/marketing/HowItWorksSteps.tsx
import type { ReactNode } from "react";
import { MarketingCard } from "./primitives";
import { MarketingIconToken } from "./MarketingIconToken";

export function HowItWorksSteps({
  title,
  steps,
}: {
  title: string;
  steps: Array<{ icon: ReactNode; number: string; title: string; description: string }>;
}) {
  return (
    <>
      <div className="mb-8 text-center md:mb-12">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-4xl">
          {title}
        </h2>
      </div>
      <div id="how-it-works" className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        {steps.map((step) => (
          <MarketingCard key={step.number} className="rounded-[2rem] p-5 md:p-7">
            <MarketingIconToken tone="primary">{step.icon}</MarketingIconToken>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {step.number}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{step.description}</p>
          </MarketingCard>
        ))}
      </div>
    </>
  );
}
```

```tsx
// frontend/src/components/marketing/ConfidenceBlock.tsx
import type { ReactNode } from "react";
import { MarketingCard } from "./primitives";
import { MarketingIconToken } from "./MarketingIconToken";

export function ConfidenceBlock({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: Array<{ icon: ReactNode; title: string; body: string }>;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)] lg:items-start">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">{intro}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <MarketingCard key={item.title} className="rounded-[2rem] p-5">
            <MarketingIconToken tone="accent">{item.icon}</MarketingIconToken>
            <h3 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.body}</p>
          </MarketingCard>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/components/marketing/UseCaseGrid.tsx
import type { ReactNode } from "react";
import { MarketingCard } from "./primitives";
import { MarketingIconToken } from "./MarketingIconToken";

export function UseCaseGrid({
  title,
  items,
}: {
  title: string;
  items: Array<{ icon: ReactNode; label: string; description: string }>;
}) {
  return (
    <>
      <div className="mb-8 text-center md:mb-12">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-4xl">
          {title}
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <MarketingCard key={item.label} className="rounded-[2rem] p-5">
            <MarketingIconToken>{item.icon}</MarketingIconToken>
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              {item.label}
            </h3>
            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{item.description}</p>
          </MarketingCard>
        ))}
      </div>
    </>
  );
}
```

```tsx
// frontend/src/app/[locale]/page.tsx
import { useTranslations } from "next-intl";
import { FileSearch, Home, Mail, PenLine, Send, ShieldCheck, UserCheck, FileWarning } from "lucide-react";
import { FinalCTABand } from "../../components/marketing/FinalCTABand";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { MarketingSection } from "../../components/marketing/primitives";
import { HomepageHero } from "../../components/marketing/HomepageHero";
import { TrustStrip } from "../../components/marketing/TrustStrip";
import { HowItWorksSteps } from "../../components/marketing/HowItWorksSteps";
import { ConfidenceBlock } from "../../components/marketing/ConfidenceBlock";
import { UseCaseGrid } from "../../components/marketing/UseCaseGrid";

export default function HomePage() {
  const t = useTranslations("marketing");

  const trustItems = [
    { icon: <Mail />, label: t("trustDelivery") },
    { icon: <ShieldCheck />, label: t("trustEncryption") },
    { icon: <UserCheck />, label: t("trustReview") },
  ];

  const steps = [
    { icon: <PenLine />, number: "01", title: t("step1Title"), description: t("step1Desc") },
    { icon: <FileSearch />, number: "02", title: t("step2Title"), description: t("step2Desc") },
    { icon: <Send />, number: "03", title: t("step3Title"), description: t("step3Desc") },
  ];

  const confidenceItems = [
    { icon: <PenLine />, title: t("confidenceCard1Title"), body: t("confidenceCard1Body") },
    { icon: <ShieldCheck />, title: t("confidenceCard2Title"), body: t("confidenceCard2Body") },
    { icon: <UserCheck />, title: t("confidenceCard3Title"), body: t("confidenceCard3Body") },
  ];

  const useCases = [
    { icon: <FileWarning />, label: t("useCaseCancel"), description: t("useCaseCancelDescription") },
    { icon: <Home />, label: t("useCaseLease"), description: t("useCaseLeaseDescription") },
    { icon: <ShieldCheck />, label: t("useCaseComplaint"), description: t("useCaseComplaintDescription") },
    { icon: <Mail />, label: t("useCaseAuthority"), description: t("useCaseAuthorityDescription") },
  ];

  return (
    <MarketingLayout mainClassName="transition-colors dark:text-zinc-50">
      <HomepageHero
        eyebrow={t("heroPanelBadge")}
        title={t("heroTitle")}
        subtitle={t("heroBody")}
        proof={t("heroProof")}
        primaryLabel={t("heroCta")}
        secondaryLabel={t("heroSecondaryCta")}
        panel={<div className="min-h-[320px] rounded-[1.5rem] bg-[var(--app-surface-soft)]" />}
      />
      <TrustStrip items={trustItems} />
      <MarketingSection muted>
        <HowItWorksSteps title={t("howItWorksTitle")} steps={steps} />
      </MarketingSection>
      <MarketingSection>
        <ConfidenceBlock
          title={t("confidenceTitle")}
          intro={t("confidenceIntro")}
          items={confidenceItems}
        />
      </MarketingSection>
      <MarketingSection muted>
        <UseCaseGrid title={t("useCasesTitle")} items={useCases} />
      </MarketingSection>
      <MarketingSection>
        <FinalCTABand
          title={t("ctaTitle")}
          body={t("finalProof")}
          primaryAction={{ href: "/draft/new", label: t("ctaButton") }}
        />
      </MarketingSection>
    </MarketingLayout>
  );
}
```

```json
// frontend/src/messages/en-CH.json
"marketing": {
  "heroTitle": "Formal letters, ready for dispatch",
  "heroBody": "Write a serious letter, review every detail, and prepare it for postal dispatch in Switzerland without setting up an account.",
  "heroPanelBadge": "Serious letters, without the blank page",
  "heroCta": "Start your letter",
  "heroSecondaryCta": "See pricing",
  "heroProof": "No account required · Transparent pricing before payment",
  "howItWorksTitle": "How it works",
  "step1Title": "Describe",
  "step1Desc": "Explain what you need in plain language and Swiss Mail shapes the right formal structure.",
  "step2Title": "Review",
  "step2Desc": "Check wording, formatting, recipient details, and every part of the final letter before you continue.",
  "step3Title": "Send",
  "step3Desc": "Choose the delivery option, pay once, and submit the letter for postal dispatch in Switzerland.",
  "trustDelivery": "Postal dispatch in Switzerland",
  "trustEncryption": "Encrypted in transit and at rest",
  "trustReview": "Review everything before you send",
  "confidenceTitle": "Built for important letters",
  "confidenceIntro": "Swiss Mail combines proper structure, calm review, and dispatch-ready preparation so you never have to improvise a formal letter from scratch.",
  "confidenceCard1Title": "Professionally structured",
  "confidenceCard1Body": "Turn a plain-language request into a letter that sounds formal, complete, and ready to send.",
  "confidenceCard2Title": "Review-first workflow",
  "confidenceCard2Body": "Check wording, formatting, and recipient details before anything is submitted for dispatch.",
  "confidenceCard3Title": "No-account convenience",
  "confidenceCard3Body": "Start immediately, pay once, and only provide the information needed to send the letter.",
  "useCasesTitle": "For important letters that need to be taken seriously",
  "useCaseCancel": "Cancel a subscription",
  "useCaseCancelDescription": "Cancel subscriptions and service contracts in clear formal language.",
  "useCaseLease": "End a lease agreement",
  "useCaseLeaseDescription": "End a lease with a serious written notice you can review before dispatch.",
  "useCaseComplaint": "Send a formal complaint",
  "useCaseComplaintDescription": "Write a complaint that is structured, calm, and hard to ignore.",
  "useCaseAuthority": "Write to an authority",
  "useCaseAuthorityDescription": "Prepare letters to authorities and official offices without starting from a blank page.",
  "ctaTitle": "Ready to send your letter?",
  "ctaButton": "Start writing",
  "finalProof": "Transparent pricing before payment"
}
```

```json
// frontend/src/messages/de-CH.json
"marketing": {
  "heroTitle": "Formelle Briefe, bereit für den Versand",
  "heroBody": "Schreiben Sie einen wichtigen Brief, prüfen Sie jedes Detail und bereiten Sie ihn ohne Konto für den postalischen Versand in der Schweiz vor.",
  "heroPanelBadge": "Wichtige Briefe, ohne leere Seite",
  "heroCta": "Brief starten",
  "heroSecondaryCta": "Preise ansehen",
  "heroProof": "Kein Konto nötig · Transparente Preise vor der Zahlung",
  "howItWorksTitle": "So funktioniert es",
  "step1Title": "Beschreiben",
  "step1Desc": "Beschreiben Sie Ihr Anliegen in Alltagssprache und Swiss Mail formt daraus die passende formelle Struktur.",
  "step2Title": "Prüfen",
  "step2Desc": "Prüfen Sie Formulierung, Formatierung, Empfängerangaben und jedes Detail des Briefs, bevor Sie weitermachen.",
  "step3Title": "Versenden",
  "step3Desc": "Wählen Sie die Versandart, zahlen Sie einmal und reichen Sie den Brief für den postalischen Versand in der Schweiz ein.",
  "trustDelivery": "Postalischer Versand in der Schweiz",
  "trustEncryption": "Unterwegs und gespeichert verschlüsselt",
  "trustReview": "Alles prüfen, bevor Sie senden",
  "confidenceTitle": "Für wichtige Briefe gebaut",
  "confidenceIntro": "Swiss Mail verbindet saubere Struktur, ruhige Prüfung und versandbereite Vorbereitung, damit Sie einen formellen Brief nicht mehr improvisieren müssen.",
  "confidenceCard1Title": "Professionell strukturiert",
  "confidenceCard1Body": "Aus einem Anliegen in Alltagssprache wird ein formeller, vollständiger und versandbereiter Brief.",
  "confidenceCard2Title": "Prüfen vor dem Versand",
  "confidenceCard2Body": "Kontrollieren Sie Formulierung, Formatierung und Empfängerdetails, bevor etwas eingereicht wird.",
  "confidenceCard3Title": "Komfort ohne Konto",
  "confidenceCard3Body": "Starten Sie sofort, zahlen Sie einmal und geben Sie nur die Angaben an, die für den Versand nötig sind.",
  "useCasesTitle": "Für wichtige Briefe, die ernst genommen werden sollen",
  "useCaseCancel": "Abonnement kündigen",
  "useCaseCancelDescription": "Kündigen Sie Abos und Dienstleistungsverträge in klarer formeller Sprache.",
  "useCaseLease": "Mietvertrag kündigen",
  "useCaseLeaseDescription": "Beenden Sie einen Mietvertrag mit einer ernsthaften schriftlichen Mitteilung, die Sie vor dem Versand prüfen können.",
  "useCaseComplaint": "Formelle Beschwerde senden",
  "useCaseComplaintDescription": "Verfassen Sie eine Beschwerde, die strukturiert, ruhig und schwer zu ignorieren ist.",
  "useCaseAuthority": "An eine Behörde schreiben",
  "useCaseAuthorityDescription": "Bereiten Sie Schreiben an Behörden und offizielle Stellen vor, ohne bei einer leeren Seite zu beginnen.",
  "ctaTitle": "Bereit, Ihren Brief zu versenden?",
  "ctaButton": "Jetzt schreiben",
  "finalProof": "Transparente Preise vor der Zahlung"
}
```

```json
// frontend/src/messages/fr-CH.json
"marketing": {
  "heroTitle": "Lettres formelles, prêtes pour l'envoi",
  "heroBody": "Rédigez une lettre importante, vérifiez chaque détail et préparez-la pour l'envoi postal en Suisse sans créer de compte.",
  "heroPanelBadge": "Lettres importantes, sans page blanche",
  "heroCta": "Commencer la lettre",
  "heroSecondaryCta": "Voir les prix",
  "heroProof": "Sans compte · Prix transparents avant le paiement",
  "howItWorksTitle": "Comment ça fonctionne",
  "step1Title": "Décrire",
  "step1Desc": "Décrivez votre besoin en langage simple et Swiss Mail construit la bonne structure formelle.",
  "step2Title": "Vérifier",
  "step2Desc": "Vérifiez la formulation, la mise en page, les coordonnées du destinataire et chaque détail avant de continuer.",
  "step3Title": "Envoyer",
  "step3Desc": "Choisissez le mode d'envoi, payez une seule fois et soumettez la lettre pour l'envoi postal en Suisse.",
  "trustDelivery": "Envoi postal en Suisse",
  "trustEncryption": "Chiffré en transit et au repos",
  "trustReview": "Tout vérifier avant l'envoi",
  "confidenceTitle": "Pensé pour les lettres importantes",
  "confidenceIntro": "Swiss Mail réunit une structure correcte, une relecture sereine et une préparation prête pour l'envoi afin que vous n'ayez plus à improviser une lettre formelle.",
  "confidenceCard1Title": "Structure professionnelle",
  "confidenceCard1Body": "Transformez une demande en langage simple en une lettre formelle, complète et prête à l'envoi.",
  "confidenceCard2Title": "Relecture avant l'envoi",
  "confidenceCard2Body": "Vérifiez le ton, la mise en page et les coordonnées du destinataire avant toute soumission.",
  "confidenceCard3Title": "Sans friction de compte",
  "confidenceCard3Body": "Commencez immédiatement, payez une fois et ne fournissez que les informations nécessaires à l'envoi.",
  "useCasesTitle": "Pour les lettres importantes qui doivent être prises au sérieux",
  "useCaseCancel": "Résilier un abonnement",
  "useCaseCancelDescription": "Résiliez des abonnements et contrats de service dans une langue formelle et claire.",
  "useCaseLease": "Résilier un bail",
  "useCaseLeaseDescription": "Résiliez un bail avec un avis écrit sérieux que vous pouvez relire avant l'envoi.",
  "useCaseComplaint": "Envoyer une réclamation formelle",
  "useCaseComplaintDescription": "Rédigez une réclamation structurée, calme et difficile à ignorer.",
  "useCaseAuthority": "Écrire à une autorité",
  "useCaseAuthorityDescription": "Préparez des lettres aux autorités et services officiels sans partir d'une page blanche.",
  "ctaTitle": "Prêt à envoyer votre lettre ?",
  "ctaButton": "Commencer à écrire",
  "finalProof": "Prix transparents avant le paiement"
}
```

```json
// frontend/src/messages/it-CH.json
"marketing": {
  "heroTitle": "Lettere formali, pronte per l'invio",
  "heroBody": "Scriva una lettera importante, verifichi ogni dettaglio e la prepari per l'invio postale in Svizzera senza creare un conto.",
  "heroPanelBadge": "Lettere importanti, senza pagina vuota",
  "heroCta": "Iniziare la lettera",
  "heroSecondaryCta": "Vedere i prezzi",
  "heroProof": "Nessun conto richiesto · Prezzi trasparenti prima del pagamento",
  "howItWorksTitle": "Come funziona",
  "step1Title": "Descrivere",
  "step1Desc": "Descriva il Suo bisogno in parole semplici e Swiss Mail costruirà la giusta struttura formale.",
  "step2Title": "Verificare",
  "step2Desc": "Verifichi formulazione, impaginazione, dati del destinatario e ogni dettaglio prima di continuare.",
  "step3Title": "Inviare",
  "step3Desc": "Scelga il tipo di spedizione, paghi una sola volta e invii la lettera per la spedizione postale in Svizzera.",
  "trustDelivery": "Invio postale in Svizzera",
  "trustEncryption": "Crittografato in transito e a riposo",
  "trustReview": "Verificare tutto prima dell'invio",
  "confidenceTitle": "Pensato per le lettere importanti",
  "confidenceIntro": "Swiss Mail unisce una struttura corretta, una revisione tranquilla e una preparazione pronta per la spedizione, così non dovrà più improvvisare una lettera formale.",
  "confidenceCard1Title": "Struttura professionale",
  "confidenceCard1Body": "Trasforma una richiesta in linguaggio semplice in una lettera formale, completa e pronta per l'invio.",
  "confidenceCard2Title": "Revisione prima dell'invio",
  "confidenceCard2Body": "Controlli tono, impaginazione e dati del destinatario prima di qualsiasi invio.",
  "confidenceCard3Title": "Comodità senza conto",
  "confidenceCard3Body": "Inizi subito, paghi una sola volta e fornisca solo i dati necessari per spedire la lettera.",
  "useCasesTitle": "Per lettere importanti che devono essere prese sul serio",
  "useCaseCancel": "Disdire un abbonamento",
  "useCaseCancelDescription": "Disdica abbonamenti e contratti di servizio con un linguaggio formale e chiaro.",
  "useCaseLease": "Disdire un contratto di locazione",
  "useCaseLeaseDescription": "Chiuda un contratto di locazione con un avviso scritto serio che può verificare prima dell'invio.",
  "useCaseComplaint": "Inviare un reclamo formale",
  "useCaseComplaintDescription": "Scriva un reclamo strutturato, calmo e difficile da ignorare.",
  "useCaseAuthority": "Scrivere a un'autorità",
  "useCaseAuthorityDescription": "Prepari lettere per autorità e uffici ufficiali senza partire da una pagina vuota.",
  "ctaTitle": "Pronto a inviare la Sua lettera?",
  "ctaButton": "Iniziare a scrivere",
  "finalProof": "Prezzi trasparenti prima del pagamento"
}
```

- [ ] **Step 4: Run the homepage regression test**

Run: `npm test -- frontend/tests/marketing-homepage.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the homepage refresh**

```bash
git add frontend/src/components/marketing/HomepageHero.tsx frontend/src/components/marketing/TrustStrip.tsx frontend/src/components/marketing/HowItWorksSteps.tsx frontend/src/components/marketing/ConfidenceBlock.tsx frontend/src/components/marketing/UseCaseGrid.tsx frontend/src/app/[locale]/page.tsx frontend/src/messages/de-CH.json frontend/src/messages/en-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json frontend/tests/marketing-homepage.test.ts
git commit -m "feat(frontend): refresh homepage marketing layout"
```

---

### Task 4: Wire marketing-route metadata and structured data, then verify the full slice

**Files:**
- Modify: `frontend/src/app/[locale]/page.tsx:1-291`
- Modify: `frontend/src/app/[locale]/pricing/page.tsx:1-25`
- Modify: `frontend/src/app/[locale]/help/page.tsx:1-109`
- Modify: `frontend/src/app/[locale]/privacy/page.tsx:1-47`
- Modify: `frontend/src/app/[locale]/terms/page.tsx:1-47`
- Modify: `frontend/src/app/[locale]/imprint/page.tsx:1-76`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Test: `frontend/tests/marketing-seo.test.ts`

- [ ] **Step 1: Extend the SEO test so route-level metadata wiring fails first**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const homePageSource = readFileSync(path.join(repoRoot, "frontend/src/app/[locale]/page.tsx"), "utf8");
const pricingPageSource = readFileSync(path.join(repoRoot, "frontend/src/app/[locale]/pricing/page.tsx"), "utf8");
const helpPageSource = readFileSync(path.join(repoRoot, "frontend/src/app/[locale]/help/page.tsx"), "utf8");
const privacyPageSource = readFileSync(path.join(repoRoot, "frontend/src/app/[locale]/privacy/page.tsx"), "utf8");
const termsPageSource = readFileSync(path.join(repoRoot, "frontend/src/app/[locale]/terms/page.tsx"), "utf8");
const imprintPageSource = readFileSync(path.join(repoRoot, "frontend/src/app/[locale]/imprint/page.tsx"), "utf8");

describe("marketing route metadata wiring", () => {
  it("exports route-level metadata for every current marketing page", () => {
    expect(homePageSource).toContain("export async function generateMetadata");
    expect(pricingPageSource).toContain("export async function generateMetadata");
    expect(helpPageSource).toContain("export async function generateMetadata");
    expect(privacyPageSource).toContain("export async function generateMetadata");
    expect(termsPageSource).toContain("export async function generateMetadata");
    expect(imprintPageSource).toContain("export async function generateMetadata");
  });

  it("renders JSON-LD on the homepage and FAQ-bearing marketing pages", () => {
    expect(homePageSource).toContain("<JsonLd");
    expect(pricingPageSource).toContain("<JsonLd");
    expect(helpPageSource).toContain("<JsonLd");
  });
});
```

- [ ] **Step 2: Run the SEO test again**

Run: `npm test -- frontend/tests/marketing-seo.test.ts`

Expected: FAIL because the route files do not yet export `generateMetadata` or render `JsonLd`.

- [ ] **Step 3: Add locale-aware metadata, JSON-LD, and SEO copy to the marketing routes**

```ts
// frontend/src/app/[locale]/page.tsx
import { useLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "../../components/marketing/JsonLd";
import {
  buildMarketingMetadata,
  buildOrganizationJsonLd,
  buildServiceJsonLd,
  buildWebsiteJsonLd,
} from "../../lib/marketing-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "de-CH" | "fr-CH" | "it-CH" | "en-CH" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "",
    title: t("homeTitle"),
    description: t("homeDescription"),
  });
}

// inside the page component, near const t = useTranslations("marketing")
const locale = useLocale() as "de-CH" | "fr-CH" | "it-CH" | "en-CH";

// inside the page component JSX
<JsonLd
  data={[
    buildOrganizationJsonLd(),
    buildWebsiteJsonLd(),
    buildServiceJsonLd({
      locale,
      title: t("heroTitle"),
      description: t("heroBody"),
    }),
  ]}
/>
```

```ts
// frontend/src/app/[locale]/pricing/page.tsx
import { useLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "../../../components/marketing/JsonLd";
import { buildMarketingMetadata, buildServiceJsonLd } from "../../../lib/marketing-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "de-CH" | "fr-CH" | "it-CH" | "en-CH" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/pricing",
    title: t("pricingTitle"),
    description: t("pricingDescription"),
  });
}

// inside the page component JSX, before <MarketingHero />
const locale = useLocale() as "de-CH" | "fr-CH" | "it-CH" | "en-CH";

<JsonLd
  data={buildServiceJsonLd({
    locale,
    title: t("title"),
    description: t("subtitle"),
  })}
/>
```

```ts
// frontend/src/app/[locale]/help/page.tsx
import { getTranslations } from "next-intl/server";
import { JsonLd } from "../../../components/marketing/JsonLd";
import { buildFaqJsonLd, buildMarketingMetadata } from "../../../lib/marketing-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "de-CH" | "fr-CH" | "it-CH" | "en-CH" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/help",
    title: t("helpTitle"),
    description: t("helpDescription"),
  });
}

// inside the page component, after the faqs array is defined
<JsonLd data={buildFaqJsonLd(faqs)} />
```

```ts
// frontend/src/app/[locale]/privacy/page.tsx
import { getTranslations } from "next-intl/server";
import { buildMarketingMetadata } from "../../../lib/marketing-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "de-CH" | "fr-CH" | "it-CH" | "en-CH" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/privacy",
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  });
}
```

```ts
// frontend/src/app/[locale]/terms/page.tsx
import { getTranslations } from "next-intl/server";
import { buildMarketingMetadata } from "../../../lib/marketing-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "de-CH" | "fr-CH" | "it-CH" | "en-CH" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/terms",
    title: t("termsTitle"),
    description: t("termsDescription"),
  });
}
```

```ts
// frontend/src/app/[locale]/imprint/page.tsx
import { getTranslations } from "next-intl/server";
import { buildMarketingMetadata } from "../../../lib/marketing-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "de-CH" | "fr-CH" | "it-CH" | "en-CH" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/imprint",
    title: t("imprintTitle"),
    description: t("imprintDescription"),
  });
}
```

```json
// append this `seo` block to each locale file
"seo": {
  "homeTitle": "Swiss Mail — Send formal letters online in Switzerland",
  "homeDescription": "Draft, review, and send formal letters online in Switzerland. No account required, transparent pricing, and dispatch-ready output.",
  "pricingTitle": "Pricing — Swiss Mail",
  "pricingDescription": "See Swiss Mail pricing for formal letters, standard dispatch, and registered delivery in Switzerland.",
  "helpTitle": "Help and FAQs — Swiss Mail",
  "helpDescription": "Read common questions about Swiss Mail, pricing, dispatch, privacy, and sending formal letters in Switzerland.",
  "privacyTitle": "Privacy policy — Swiss Mail",
  "privacyDescription": "Read how Swiss Mail handles documents, personal data, retention, and privacy-conscious infrastructure.",
  "termsTitle": "Terms of service — Swiss Mail",
  "termsDescription": "Review Swiss Mail terms for drafting, payment, dispatch preparation, and use of the service.",
  "imprintTitle": "Imprint — Swiss Mail",
  "imprintDescription": "Company, contact, and legal publishing information for Swiss Mail."
}
```

```json
// frontend/src/messages/de-CH.json
"seo": {
  "homeTitle": "Swiss Mail — Briefe online in der Schweiz versenden",
  "homeDescription": "Formelle Briefe online in der Schweiz schreiben, prüfen und versenden. Kein Konto nötig, transparente Preise und versandbereite Ausgabe.",
  "pricingTitle": "Preise — Swiss Mail",
  "pricingDescription": "Sehen Sie die Swiss-Mail-Preise für formelle Briefe, Standardversand und Einschreiben in der Schweiz.",
  "helpTitle": "Hilfe und FAQ — Swiss Mail",
  "helpDescription": "Lesen Sie häufige Fragen zu Swiss Mail, Preisen, Versand, Datenschutz und formellen Briefen in der Schweiz.",
  "privacyTitle": "Datenschutzerklärung — Swiss Mail",
  "privacyDescription": "Erfahren Sie, wie Swiss Mail Dokumente, Personendaten, Aufbewahrung und datenschutzbewusste Infrastruktur behandelt.",
  "termsTitle": "AGB — Swiss Mail",
  "termsDescription": "Prüfen Sie die Swiss-Mail-Bedingungen für Briefentwürfe, Zahlung, Versandvorbereitung und Nutzung des Dienstes.",
  "imprintTitle": "Impressum — Swiss Mail",
  "imprintDescription": "Unternehmens-, Kontakt- und rechtliche Angaben zu Swiss Mail."
}
```

```json
// frontend/src/messages/fr-CH.json
"seo": {
  "homeTitle": "Swiss Mail — Envoyer des lettres formelles en ligne en Suisse",
  "homeDescription": "Rédigez, vérifiez et envoyez des lettres formelles en ligne en Suisse. Sans compte, avec des prix transparents et une préparation prête pour l'envoi.",
  "pricingTitle": "Tarifs — Swiss Mail",
  "pricingDescription": "Consultez les tarifs Swiss Mail pour les lettres formelles, l'envoi standard et le recommandé en Suisse.",
  "helpTitle": "Aide et FAQ — Swiss Mail",
  "helpDescription": "Consultez les questions fréquentes sur Swiss Mail, les prix, l'envoi, la confidentialité et les lettres formelles en Suisse.",
  "privacyTitle": "Politique de confidentialité — Swiss Mail",
  "privacyDescription": "Découvrez comment Swiss Mail traite les documents, les données personnelles, la rétention et une infrastructure attentive à la confidentialité.",
  "termsTitle": "Conditions d'utilisation — Swiss Mail",
  "termsDescription": "Consultez les conditions Swiss Mail pour la rédaction, le paiement, la préparation à l'envoi et l'utilisation du service.",
  "imprintTitle": "Mentions légales — Swiss Mail",
  "imprintDescription": "Informations sur l'entreprise, le contact et la publication légale de Swiss Mail."
}
```

```json
// frontend/src/messages/it-CH.json
"seo": {
  "homeTitle": "Swiss Mail — Inviare lettere formali online in Svizzera",
  "homeDescription": "Scriva, verifichi e invii lettere formali online in Svizzera. Nessun conto richiesto, prezzi trasparenti e preparazione pronta per la spedizione.",
  "pricingTitle": "Prezzi — Swiss Mail",
  "pricingDescription": "Consulti i prezzi Swiss Mail per lettere formali, spedizione standard e raccomandata in Svizzera.",
  "helpTitle": "Aiuto e FAQ — Swiss Mail",
  "helpDescription": "Legga le domande frequenti su Swiss Mail, prezzi, spedizione, privacy e lettere formali in Svizzera.",
  "privacyTitle": "Informativa sulla privacy — Swiss Mail",
  "privacyDescription": "Scopra come Swiss Mail gestisce documenti, dati personali, conservazione e infrastruttura attenta alla privacy.",
  "termsTitle": "Termini di servizio — Swiss Mail",
  "termsDescription": "Verifichi i termini Swiss Mail per redazione, pagamento, preparazione alla spedizione e uso del servizio.",
  "imprintTitle": "Colophon — Swiss Mail",
  "imprintDescription": "Informazioni aziendali, di contatto e legali su Swiss Mail."
}
```

- [ ] **Step 4: Run the targeted SEO test and a typecheck**

Run: `npm test -- frontend/tests/marketing-seo.test.ts && npm run typecheck`

Expected: PASS

- [ ] **Step 5: Run the full repo verification**

Run: `npm test && npm run typecheck && npm run lint`

Expected: PASS

- [ ] **Step 6: Commit the marketing SEO wiring**

```bash
git add frontend/src/app/[locale]/page.tsx frontend/src/app/[locale]/pricing/page.tsx frontend/src/app/[locale]/help/page.tsx frontend/src/app/[locale]/privacy/page.tsx frontend/src/app/[locale]/terms/page.tsx frontend/src/app/[locale]/imprint/page.tsx frontend/src/messages/de-CH.json frontend/src/messages/en-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json frontend/tests/marketing-seo.test.ts
git commit -m "feat(frontend): add marketing metadata and structured data"
```
