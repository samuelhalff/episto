# Pricing page canonical source implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pricing page's hardcoded reference pricing with the same stored pricing source used by the app, expose sync freshness metadata, and rewrite the page into a cleaner, more itemized structure.

**Architecture:** Treat the merged pricing-sync/storage work as a prerequisite. Extend the shared public pricing contract with sync metadata, refactor backend public pricing into a mapper over the canonical stored pricing snapshot, then rewrite the frontend pricing page so one sync banner and one totals card anchor the page while the detailed math lives in concise breakdown tables. Update the pricing docs so the stored snapshot and stale-state behavior become the written source of truth.

**Tech Stack:** Next.js App Router, TypeScript, next-intl, React Query, Fastify, Drizzle ORM, Zod, Vitest, Tailwind CSS

---

## Prerequisite

Start this plan **after** the parallel pricing-sync/storage work has landed on `main`.

When you begin Task 2, inspect the merged sync work and import its canonical stored-pricing reader into `backend/src/modules/pricing/pricing.routes.ts` under the local alias `readStoredPricingSnapshot`. The rest of this plan assumes that alias exists at the route boundary.

## Matrix-backed scope amendment

After aligning this plan with the provider quote caching / rate-matrix design already present in the
repo, Tasks 2-4 must treat the active provider rate matrix as the canonical stored source.

This changes one important constraint:

- do **not** keep or invent raw C4 / duplex / synthetic unit-rate fields if they are not provable from
  the active matrix
- instead, expose and render only the matrix-backed assumptions and scenario rows that the stored
  entries actually support today

Carry this amendment into the Task 2 backend contract work, the Task 3 frontend rewrite, and the Task 4
docs updates.

---

## File map

- **Create:** `backend/src/modules/pricing/public-pricing.service.ts` — pure mapper from canonical stored pricing data into `PublicPricingResponse`
- **Modify:** `backend/src/modules/pricing/index.ts` — make `getPublicPricing` async and delegate to the pure mapper
- **Modify:** `backend/src/modules/pricing/pricing.routes.ts` — pass `getDb()` and the canonical stored-pricing reader into `getPublicPricing`
- **Modify:** `backend/tests/pricing.test.ts` — cover sync metadata mapping and missing-snapshot failure
- **Modify:** `backend/tests/pricing-routes.test.ts` — keep the route-facing response shape honest and include sync metadata
- **Modify:** `shared/src/contracts/index.ts` — add `PublicPricingSyncSchema` and wire it into `PublicPricingResponseSchema`
- **Modify:** `shared/tests/contracts.test.ts` — require `sync` in the public pricing contract
- **Create:** `frontend/tests/pricing-page.test.ts` — regression coverage for the sync banner, stale-state rendering, and removal of duplicated legacy pricing cards
- **Modify:** `frontend/src/components/marketing/PricingPageClient.tsx` — rewrite the pricing page around one sync banner, one totals card, one composition card, and one provider-rates card
- **Modify:** `frontend/src/hooks/use-pricing.ts` — update the hook comment to reflect stored synced pricing rather than backend redeploy-only changes
- **Modify:** `frontend/src/messages/en-CH.json` — add sync-status copy and tighten pricing-page wording
- **Modify:** `frontend/src/messages/de-CH.json` — same keys and rewritten pricing copy in German
- **Modify:** `frontend/src/messages/fr-CH.json` — same keys and rewritten pricing copy in French
- **Modify:** `frontend/src/messages/it-CH.json` — same keys and rewritten pricing copy in Italian
- **Modify:** `docs/04-product/pricing-structure.md` — replace live-preview wording with stored-snapshot wording
- **Modify:** `docs/03-ux/page-specifications.md` — add the sync banner and stale-state behavior to `/pricing`
- **Modify:** `docs/03-ux/marketing-pages.md` — align the dedicated pricing-page section with the new information architecture

---

### Task 1: Extend the shared public pricing contract

**Files:**
- Modify: `shared/src/contracts/index.ts`
- Modify: `shared/tests/contracts.test.ts`

- [ ] **Step 1: Write the failing shared contract regression**

```ts
// shared/tests/contracts.test.ts

it("requires sync metadata on the public pricing response", () => {
  const result = PublicPricingResponseSchema.parse({
    standard: {
      totalCents: 495,
      displayPrice: "CHF 4.95",
      currency: "CHF",
      providerQuotedCents: 155,
      providerQuotedDisplayPrice: "CHF 1.55",
      swissMailMarkupCents: 340,
      swissMailMarkupDisplayPrice: "CHF 3.40",
    },
    registered: {
      totalCents: 918,
      displayPrice: "CHF 9.18",
      currency: "CHF",
      providerQuotedCents: 578,
      providerQuotedDisplayPrice: "CHF 5.78",
      swissMailMarkupCents: 340,
      swissMailMarkupDisplayPrice: "CHF 3.40",
    },
    registeredSurchargeCents: 423,
    registeredSurchargeDisplayPrice: "CHF 4.23",
    sync: {
      sourceLabel: "ePost daily sync",
      lastSyncedAt: "2026-04-07T06:00:00.000Z",
      freshness: "fresh",
    },
    providerBreakdown: {
      providerName: "ePost",
      note: "Reference scenario built from the latest stored provider pricing snapshot.",
      sourceUrl: "https://www.epost.ch/en/business-customers/digital-letter",
      verifiedDate: "2026-04-07",
      perPrintedPageCents: 5,
      perA4SheetCents: 10,
      envelopeC5Cents: 30,
      envelopeC4Cents: 60,
      postageCents: {
        A_POST: 110,
        B_POST: 92,
        B_POST_LARGEVOLUME: 60,
        A_PLUS: 267,
        REGISTERED: 533,
      },
      firstSheetC5Cents: {
        simplexCents: 45,
        duplexCents: 50,
      },
      additionalA4SheetCents: {
        simplexCents: 15,
        duplexCents: 20,
      },
      referenceScenario: {
        printedPages: 1,
        physicalSheets: 1,
        envelopeFormat: "C5",
        standardPostage: "A_POST",
        registeredPostage: "REGISTERED",
      },
      pricesExcludeVat: true,
      currency: "CHF",
    },
  });

  expect(result.sync.freshness).toBe("fresh");
  expect(result.sync.lastSyncedAt).toBe("2026-04-07T06:00:00.000Z");
});

it("rejects unsupported public pricing freshness values", () => {
  expect(() =>
    PublicPricingResponseSchema.parse({
      standard: {
        totalCents: 495,
        displayPrice: "CHF 4.95",
        currency: "CHF",
        providerQuotedCents: 155,
        providerQuotedDisplayPrice: "CHF 1.55",
        swissMailMarkupCents: 340,
        swissMailMarkupDisplayPrice: "CHF 3.40",
      },
      registered: {
        totalCents: 918,
        displayPrice: "CHF 9.18",
        currency: "CHF",
        providerQuotedCents: 578,
        providerQuotedDisplayPrice: "CHF 5.78",
        swissMailMarkupCents: 340,
        swissMailMarkupDisplayPrice: "CHF 3.40",
      },
      registeredSurchargeCents: 423,
      registeredSurchargeDisplayPrice: "CHF 4.23",
      sync: {
        sourceLabel: "ePost daily sync",
        lastSyncedAt: "2026-04-07T06:00:00.000Z",
        freshness: "late",
      },
      providerBreakdown: {
        providerName: "ePost",
        note: "Reference scenario built from the latest stored provider pricing snapshot.",
        sourceUrl: "https://www.epost.ch/en/business-customers/digital-letter",
        verifiedDate: "2026-04-07",
        perPrintedPageCents: 5,
        perA4SheetCents: 10,
        envelopeC5Cents: 30,
        envelopeC4Cents: 60,
        postageCents: {
          A_POST: 110,
          B_POST: 92,
          B_POST_LARGEVOLUME: 60,
          A_PLUS: 267,
          REGISTERED: 533,
        },
        firstSheetC5Cents: {
          simplexCents: 45,
          duplexCents: 50,
        },
        additionalA4SheetCents: {
          simplexCents: 15,
          duplexCents: 20,
        },
        referenceScenario: {
          printedPages: 1,
          physicalSheets: 1,
          envelopeFormat: "C5",
          standardPostage: "A_POST",
          registeredPostage: "REGISTERED",
        },
        pricesExcludeVat: true,
        currency: "CHF",
      },
    }),
  ).toThrow();
});
```

- [ ] **Step 2: Run the shared contract test to verify it fails**

Run: `npm test -- shared/tests/contracts.test.ts`

Expected: FAIL because `PublicPricingResponseSchema` does not yet retain `sync`, so `result.sync` is `undefined`, and the freshness enum does not exist.

- [ ] **Step 3: Add the sync schema to the shared contract**

```ts
// shared/src/contracts/index.ts

export const PublicPricingSyncSchema = z.object({
  sourceLabel: z.string().min(1),
  lastSyncedAt: z.string().datetime(),
  freshness: z.enum(["fresh", "stale"]),
});

export const PublicPricingResponseSchema = z.object({
  standard: PublicPricingTierSchema,
  registered: PublicPricingTierSchema,
  registeredSurchargeCents: z.number().int().nonnegative(),
  registeredSurchargeDisplayPrice: z.string().min(1),
  sync: PublicPricingSyncSchema,
  providerBreakdown: z.object({
    providerName: z.literal("ePost"),
    note: z.string().min(1),
    sourceUrl: z.string().url(),
    verifiedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    perPrintedPageCents: z.number().int().nonnegative(),
    perA4SheetCents: z.number().int().nonnegative(),
    envelopeC5Cents: z.number().int().nonnegative(),
    envelopeC4Cents: z.number().int().nonnegative(),
    postageCents: ProviderPostageRateSchema,
    firstSheetC5Cents: ProviderPrintRateSchema,
    additionalA4SheetCents: ProviderPrintRateSchema,
    referenceScenario: PublicPricingReferenceScenarioSchema,
    pricesExcludeVat: z.boolean(),
    currency: z.literal("CHF"),
  }),
});

export type PublicPricingSync = z.infer<typeof PublicPricingSyncSchema>;
```

- [ ] **Step 4: Run the shared contract test to verify it passes**

Run: `npm test -- shared/tests/contracts.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the shared pricing contract**

```bash
git add shared/src/contracts/index.ts shared/tests/contracts.test.ts
git commit -m "feat(shared): add public pricing sync metadata" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Map stored pricing into the public backend response

**Files:**
- Create: `backend/src/modules/pricing/public-pricing.service.ts`
- Modify: `backend/src/modules/pricing/index.ts`
- Modify: `backend/src/modules/pricing/pricing.routes.ts`
- Modify: `backend/tests/pricing.test.ts`
- Modify: `backend/tests/pricing-routes.test.ts`

- [ ] **Step 1: Write the failing backend pricing tests**

```ts
// backend/tests/pricing.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  buildPublicPricingResponse,
  getPublicPricing,
  type CanonicalStoredPricingSnapshot,
} from "../src/modules/pricing/index.js";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    PRICE_STANDARD_MARKUP_CENTS: 340,
    PRICE_REGISTERED_MARKUP_CENTS: 340,
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
  }),
}));

const snapshot: CanonicalStoredPricingSnapshot = {
  sourceLabel: "ePost daily sync",
  lastSyncedAt: new Date("2026-04-07T06:00:00.000Z"),
  freshness: "stale",
  perPrintedPageCents: 5,
  perA4SheetCents: 10,
  envelopeC5Cents: 30,
  envelopeC4Cents: 60,
  postageCents: {
    A_POST: 110,
    B_POST: 92,
    B_POST_LARGEVOLUME: 60,
    A_PLUS: 267,
    REGISTERED: 533,
  },
  pricesExcludeVat: true,
};

describe("buildPublicPricingResponse", () => {
  it("maps the stored pricing snapshot into totals and sync metadata", () => {
    const result = buildPublicPricingResponse({
      snapshot,
      standardMarkupCents: 340,
      registeredMarkupCents: 340,
      standardPostage: "A_POST",
      registeredPostage: "REGISTERED",
    });

    expect(result.standard.totalCents).toBe(495);
    expect(result.registered.totalCents).toBe(918);
    expect(result.sync).toEqual({
      sourceLabel: "ePost daily sync",
      lastSyncedAt: "2026-04-07T06:00:00.000Z",
      freshness: "stale",
    });
    expect(result.providerBreakdown.note).toBe(
      "Reference scenario built from the latest stored provider pricing snapshot.",
    );
  });
});

describe("getPublicPricing", () => {
  it("fails clearly when no stored pricing snapshot exists", async () => {
    const readStoredPricingSnapshot = vi.fn().mockResolvedValue(null);

    await expect(
      getPublicPricing({} as never, readStoredPricingSnapshot),
    ).rejects.toMatchObject({
      code: "PRICING_UNAVAILABLE",
      statusCode: 503,
      userMessage: "Pricing information is temporarily unavailable. Please try again shortly.",
    });
  });
});
```

```ts
// backend/tests/pricing-routes.test.ts

import { describe, expect, it } from "vitest";

import {
  buildPublicPricingResponse,
  type CanonicalStoredPricingSnapshot,
} from "../src/modules/pricing/index.js";

const freshSnapshot: CanonicalStoredPricingSnapshot = {
  sourceLabel: "ePost daily sync",
  lastSyncedAt: new Date("2026-04-07T06:00:00.000Z"),
  freshness: "fresh",
  perPrintedPageCents: 5,
  perA4SheetCents: 10,
  envelopeC5Cents: 30,
  envelopeC4Cents: 60,
  postageCents: {
    A_POST: 110,
    B_POST: 92,
    B_POST_LARGEVOLUME: 60,
    A_PLUS: 267,
    REGISTERED: 533,
  },
  pricesExcludeVat: true,
};

describe("pricing routes — response shape", () => {
  it("includes sync metadata alongside the public pricing tiers", () => {
    const pricing = buildPublicPricingResponse({
      snapshot: freshSnapshot,
      standardMarkupCents: 340,
      registeredMarkupCents: 340,
      standardPostage: "A_POST",
      registeredPostage: "REGISTERED",
    });

    expect(pricing.sync.freshness).toBe("fresh");
    expect(pricing.sync.sourceLabel).toBe("ePost daily sync");
    expect(pricing.standard.displayPrice).toBe("CHF 4.95");
  });
});
```

- [ ] **Step 2: Run the backend pricing tests to verify they fail**

Run: `npm test -- backend/tests/pricing.test.ts backend/tests/pricing-routes.test.ts`

Expected: FAIL because `buildPublicPricingResponse`, `CanonicalStoredPricingSnapshot`, and the async missing-snapshot path do not exist yet.

- [ ] **Step 3: Create the pure mapper and make the route consume stored pricing**

```ts
// backend/src/modules/pricing/public-pricing.service.ts

import {
  PublicPricingResponseSchema,
  type PostalPostage,
  type PublicPricingResponse,
} from "@swiss-mail/shared";

export interface CanonicalStoredPricingSnapshot {
  sourceLabel: string;
  lastSyncedAt: Date;
  freshness: "fresh" | "stale";
  perPrintedPageCents: number;
  perA4SheetCents: number;
  envelopeC5Cents: number;
  envelopeC4Cents: number;
  postageCents: Record<PostalPostage, number>;
  pricesExcludeVat: boolean;
}

const EPOST_SOURCE_URL = "https://www.epost.ch/en/business-customers/digital-letter";

function formatCHF(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `CHF ${whole}.${frac.toString().padStart(2, "0")}`;
}

export function buildPublicPricingResponse({
  snapshot,
  standardMarkupCents,
  registeredMarkupCents,
  standardPostage,
  registeredPostage,
}: {
  snapshot: CanonicalStoredPricingSnapshot;
  standardMarkupCents: number;
  registeredMarkupCents: number;
  standardPostage: PostalPostage;
  registeredPostage: PostalPostage;
}): PublicPricingResponse {
  const referenceScenario = {
    printedPages: 1,
    physicalSheets: 1,
    envelopeFormat: "C5" as const,
    standardPostage,
    registeredPostage,
  };

  const buildProviderQuotedCents = (postage: PostalPostage) =>
    snapshot.perPrintedPageCents +
    snapshot.perA4SheetCents +
    snapshot.envelopeC5Cents +
    snapshot.postageCents[postage];

  const standardProviderQuotedCents = buildProviderQuotedCents(standardPostage);
  const registeredProviderQuotedCents = buildProviderQuotedCents(registeredPostage);
  const standardTotalCents = standardProviderQuotedCents + standardMarkupCents;
  const registeredTotalCents = registeredProviderQuotedCents + registeredMarkupCents;
  const registeredSurchargeCents = registeredTotalCents - standardTotalCents;

  return PublicPricingResponseSchema.parse({
    standard: {
      totalCents: standardTotalCents,
      displayPrice: formatCHF(standardTotalCents),
      currency: "CHF",
      providerQuotedCents: standardProviderQuotedCents,
      providerQuotedDisplayPrice: formatCHF(standardProviderQuotedCents),
      swissMailMarkupCents: standardMarkupCents,
      swissMailMarkupDisplayPrice: formatCHF(standardMarkupCents),
    },
    registered: {
      totalCents: registeredTotalCents,
      displayPrice: formatCHF(registeredTotalCents),
      currency: "CHF",
      providerQuotedCents: registeredProviderQuotedCents,
      providerQuotedDisplayPrice: formatCHF(registeredProviderQuotedCents),
      swissMailMarkupCents: registeredMarkupCents,
      swissMailMarkupDisplayPrice: formatCHF(registeredMarkupCents),
    },
    registeredSurchargeCents,
    registeredSurchargeDisplayPrice: formatCHF(registeredSurchargeCents),
    sync: {
      sourceLabel: snapshot.sourceLabel,
      lastSyncedAt: snapshot.lastSyncedAt.toISOString(),
      freshness: snapshot.freshness,
    },
    providerBreakdown: {
      providerName: "ePost",
      note: "Reference scenario built from the latest stored provider pricing snapshot.",
      sourceUrl: EPOST_SOURCE_URL,
      verifiedDate: snapshot.lastSyncedAt.toISOString().slice(0, 10),
      perPrintedPageCents: snapshot.perPrintedPageCents,
      perA4SheetCents: snapshot.perA4SheetCents,
      envelopeC5Cents: snapshot.envelopeC5Cents,
      envelopeC4Cents: snapshot.envelopeC4Cents,
      postageCents: snapshot.postageCents,
      firstSheetC5Cents: {
        simplexCents:
          snapshot.perPrintedPageCents + snapshot.perA4SheetCents + snapshot.envelopeC5Cents,
        duplexCents:
          snapshot.perPrintedPageCents * 2 +
          snapshot.perA4SheetCents +
          snapshot.envelopeC5Cents,
      },
      additionalA4SheetCents: {
        simplexCents: snapshot.perPrintedPageCents + snapshot.perA4SheetCents,
        duplexCents: snapshot.perPrintedPageCents * 2 + snapshot.perA4SheetCents,
      },
      referenceScenario,
      pricesExcludeVat: snapshot.pricesExcludeVat,
      currency: "CHF",
    },
  });
}

export { formatCHF };
```

```ts
// backend/src/modules/pricing/index.ts

import type { Db } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { AppError } from "../../shared/errors/index.js";
import {
  buildPublicPricingResponse,
  type CanonicalStoredPricingSnapshot,
} from "./public-pricing.service.js";

export async function getPublicPricing(
  db: Db,
  readStoredPricingSnapshot: (
    db: Db,
  ) => Promise<CanonicalStoredPricingSnapshot | null>,
) {
  const snapshot = await readStoredPricingSnapshot(db);

  if (!snapshot) {
    throw new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "PRICING_UNAVAILABLE",
      message: "No stored pricing snapshot is available.",
      userMessage: "Pricing information is temporarily unavailable. Please try again shortly.",
      userAction: "Please try again shortly.",
    });
  }

  const config = env();

  return buildPublicPricingResponse({
    snapshot,
    standardMarkupCents: config.PRICE_STANDARD_MARKUP_CENTS,
    registeredMarkupCents: config.PRICE_REGISTERED_MARKUP_CENTS,
    standardPostage: config.EPOST_STANDARD_POSTAGE,
    registeredPostage: config.EPOST_REGISTERED_POSTAGE,
  });
}

export type { CanonicalStoredPricingSnapshot } from "./public-pricing.service.js";
export { buildPublicPricingResponse, formatCHF } from "./public-pricing.service.js";
```

```ts
// backend/src/modules/pricing/pricing.routes.ts

import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/index.js";
import { getPublicPricing } from "./index.js";

export async function pricingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/pricing", async (_request, reply) => {
    reply.send(await getPublicPricing(getDb(), readStoredPricingSnapshot));
  });
}
```

Use the canonical stored-pricing reader exported by the merged prerequisite sync/storage work and import it into `pricing.routes.ts` under the local alias `readStoredPricingSnapshot`.

- [ ] **Step 4: Run the backend pricing tests to verify they pass**

Run: `npm test -- backend/tests/pricing.test.ts backend/tests/pricing-routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the backend pricing mapper**

```bash
git add backend/src/modules/pricing/public-pricing.service.ts backend/src/modules/pricing/index.ts backend/src/modules/pricing/pricing.routes.ts backend/tests/pricing.test.ts backend/tests/pricing-routes.test.ts
git commit -m "feat(backend): serve public pricing from stored sync data" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Rewrite the frontend pricing page around the canonical pricing story

**Files:**
- Create: `frontend/tests/pricing-page.test.ts`
- Modify: `frontend/src/components/marketing/PricingPageClient.tsx`
- Modify: `frontend/src/hooks/use-pricing.ts`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`

- [ ] **Step 1: Write the failing pricing-page regression**

```ts
// frontend/tests/pricing-page.test.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { i18nState, pricingState } = vi.hoisted(() => ({
  i18nState: { messages: {} as Record<string, unknown> },
  pricingState: {
    value: {
      data: null,
      isLoading: false,
      isError: false,
    } as { data: any; isLoading: boolean; isError: boolean },
  },
}));

const getNested = (source: unknown, keyPath: string) =>
  keyPath.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    return (value as Record<string, unknown>)[segment];
  }, source);

vi.mock("next-intl", () => ({
  useLocale: () => "en-CH",
  useTranslations(namespace?: string) {
    return (key: string, values?: Record<string, unknown>) => {
      const base = namespace ? getNested(i18nState.messages, namespace) : i18nState.messages;
      const message = getNested(base, key);
      if (typeof message !== "string") {
        throw new Error(`Missing translation: ${namespace ? `${namespace}.` : ""}${key}`);
      }
      return message.replace(/\{(\w+)\}/g, (_, token: string) =>
        String(values?.[token] ?? `{${token}}`),
      );
    };
  },
}));

vi.mock("../src/hooks/use-pricing", () => ({
  usePricing: () => pricingState.value,
}));

vi.mock("../src/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({ href, children, ...props }: Record<string, unknown>) =>
      React.createElement("a", { href: typeof href === "string" ? href : "#", ...props }, children),
  };
});

import {
  PricingBreakdownSection,
  PricingHeroPanel,
} from "../src/components/marketing/PricingPageClient";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pricingPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/PricingPageClient.tsx"),
  "utf8",
);
const enMessages = JSON.parse(
  readFileSync(path.join(repoRoot, "frontend/src/messages/en-CH.json"), "utf8"),
);

describe("pricing page canonical source", () => {
  it("wires the sync banner and removes the duplicated reference card", () => {
    expect(pricingPageSource).toContain('const sync = pricing.data?.sync ?? null');
    expect(pricingPageSource).toContain('const isStale = sync?.freshness === "stale"');
    expect(pricingPageSource).toContain('t("syncStatusTitle")');
    expect(pricingPageSource).toContain('t("summaryCardTitle")');
    expect(pricingPageSource).toContain('t("providerCardTitle")');
    expect(pricingPageSource).not.toContain('t("referenceCardEyebrow")');
  });

  it("shows stale pricing metadata without hiding the last synced amounts", () => {
    i18nState.messages = enMessages;
    pricingState.value = {
      data: {
        standard: {
          totalCents: 495,
          displayPrice: "CHF 4.95",
          currency: "CHF",
          providerQuotedCents: 155,
          providerQuotedDisplayPrice: "CHF 1.55",
          swissMailMarkupCents: 340,
          swissMailMarkupDisplayPrice: "CHF 3.40",
        },
        registered: {
          totalCents: 918,
          displayPrice: "CHF 9.18",
          currency: "CHF",
          providerQuotedCents: 578,
          providerQuotedDisplayPrice: "CHF 5.78",
          swissMailMarkupCents: 340,
          swissMailMarkupDisplayPrice: "CHF 3.40",
        },
        registeredSurchargeCents: 423,
        registeredSurchargeDisplayPrice: "CHF 4.23",
        sync: {
          sourceLabel: "ePost daily sync",
          lastSyncedAt: "2026-04-07T06:00:00.000Z",
          freshness: "stale",
        },
        providerBreakdown: {
          providerName: "ePost",
          note: "Reference scenario built from the latest stored provider pricing snapshot.",
          sourceUrl: "https://www.epost.ch/en/business-customers/digital-letter",
          verifiedDate: "2026-04-07",
          perPrintedPageCents: 5,
          perA4SheetCents: 10,
          envelopeC5Cents: 30,
          envelopeC4Cents: 60,
          postageCents: {
            A_POST: 110,
            B_POST: 92,
            B_POST_LARGEVOLUME: 60,
            A_PLUS: 267,
            REGISTERED: 533,
          },
          firstSheetC5Cents: {
            simplexCents: 45,
            duplexCents: 50,
          },
          additionalA4SheetCents: {
            simplexCents: 15,
            duplexCents: 20,
          },
          referenceScenario: {
            printedPages: 1,
            physicalSheets: 1,
            envelopeFormat: "C5",
            standardPostage: "A_POST",
            registeredPostage: "REGISTERED",
          },
          pricesExcludeVat: true,
          currency: "CHF",
        },
      },
      isLoading: false,
      isError: false,
    };

    const html = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(PricingHeroPanel),
        React.createElement(PricingBreakdownSection),
      ),
    );

    expect(html).toContain("CHF 4.95");
    expect(html).toContain("CHF 9.18");
    expect(html).toContain(enMessages.pricing.syncStaleBody);
  });
});
```

- [ ] **Step 2: Run the pricing-page regression to verify it fails**

Run: `npm test -- frontend/tests/pricing-page.test.ts`

Expected: FAIL because the page does not yet read `sync`, still renders the legacy reference card, and has no stale-status copy.

- [ ] **Step 3: Rewrite the pricing page and update the locale copy**

```tsx
// frontend/src/components/marketing/PricingPageClient.tsx

import { useLocale, useTranslations } from "next-intl";

export function PricingHeroPanel() {
  const locale = useLocale();
  const t = useTranslations("pricing");
  const pricing = usePricing();
  const provider = pricing.data?.providerBreakdown ?? null;
  const sync = pricing.data?.sync ?? null;
  const isStale = sync?.freshness === "stale";
  const formattedSyncDate = sync
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(sync.lastSyncedAt))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <PricingFromText
          titleClassName="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 md:text-5xl"
          noteClassName="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300"
        />
      </div>

      {pricing.isError ? (
        <MarketingNotice className="text-zinc-600 dark:text-zinc-300">
          {t("pricingUnavailableBody")}
        </MarketingNotice>
      ) : null}

      {sync ? (
        <MarketingNotice
          className={cx(
            "rounded-3xl border px-5 py-4 text-sm leading-7",
            isStale
              ? "border-amber-300 bg-amber-50/80 text-zinc-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-zinc-100"
              : "border-zinc-200/80 bg-white/80 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                {t("syncStatusTitle")}
              </p>
              <p className="mt-2">{isStale ? t("syncStaleBody") : t("syncFreshBody")}</p>
            </div>
            <span
              className={cx(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                isStale
                  ? "bg-amber-200/80 text-amber-950 dark:bg-amber-400/15 dark:text-amber-200"
                  : "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200",
              )}
            >
              {isStale ? t("syncStaleLabel") : t("syncFreshLabel")}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
            <p>{t("syncSourceLabel", { source: sync.sourceLabel })}</p>
            <p>{t("syncUpdatedLabel", { date: formattedSyncDate ?? "" })}</p>
          </div>
        </MarketingNotice>
      ) : null}

      <div className="space-y-3">
        <PricingInlineRow
          label={t("standardTotalLabel")}
          price={<PriceAmount loading={pricing.isLoading} value={pricing.data?.standard.displayPrice} fallback={t("priceUnavailable")} />}
        />
        <PricingInlineRow
          label={t("registeredAddonLabel")}
          price={<PriceAmount loading={pricing.isLoading} value={pricing.data?.registeredSurchargeDisplayPrice} fallback={t("priceUnavailable")} />}
        />
        <PricingInlineRow
          label={t("registeredTotalLabel")}
          price={<PriceAmount loading={pricing.isLoading} value={pricing.data?.registered.displayPrice} fallback={t("priceUnavailable")} />}
          highlight
        />
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/components/marketing/PricingPageClient.tsx

export function PricingBreakdownSection() {
  const t = useTranslations("pricing");
  const pricing = usePricing();
  const standard = pricing.data?.standard ?? null;
  const registered = pricing.data?.registered ?? null;
  const provider = pricing.data?.providerBreakdown ?? null;

  return (
    <>
      <MarketingSection className="pb-0 pt-0 md:pt-0">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <MarketingCard tone="soft" className="space-y-6">
              <div>
                <SectionLabel className="text-amber-700 dark:text-amber-400">
                  {t("pricingTableTitle")}
                </SectionLabel>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
                  {t("summaryCardTitle")}
                </h2>
                <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {t("summaryCardBody")}
                </p>
              </div>

              <div className="space-y-3">
                <PricingRow
                  label={t("standardTotalLabel")}
                  price={<PriceAmount loading={pricing.isLoading} value={standard?.displayPrice} fallback={t("priceUnavailable")} />}
                />
                <PricingRow
                  label={t("registeredAddonLabel")}
                  price={<PriceAmount loading={pricing.isLoading} value={pricing.data?.registeredSurchargeDisplayPrice} fallback={t("priceUnavailable")} />}
                />
                <PricingRow
                  label={t("registeredTotalLabel")}
                  price={<PriceAmount loading={pricing.isLoading} value={registered?.displayPrice} fallback={t("priceUnavailable")} />}
                  highlight
                />
              </div>

              <MarketingNotice className="text-zinc-600 dark:text-zinc-300">
                {t("checkoutTruth")}
              </MarketingNotice>
            </MarketingCard>

            <MarketingCard tone="contrast">
              <SectionLabel className="text-white/70 dark:text-amber-200/80">
                {t("serviceCardEyebrow")}
              </SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white dark:text-zinc-50 md:text-4xl">
                {t("serviceCardTitle")}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 dark:text-zinc-300">
                {t("serviceCardBody")}
              </p>
              <div className="mt-8 space-y-4">
                <PricingFeature icon={<ReceiptText className="h-5 w-5" />} label={t("serviceFeeLabel")} description={<PriceAmount loading={pricing.isLoading} value={standard?.swissMailMarkupDisplayPrice} fallback={t("priceUnavailable")} />} />
                <PricingFeature icon={<MailOpen className="h-5 w-5" />} label={t("providerStandardQuoteLabel")} description={<PriceAmount loading={pricing.isLoading} value={standard?.providerQuotedDisplayPrice} fallback={t("priceUnavailable")} />} />
                <PricingFeature icon={<FileStack className="h-5 w-5" />} label={t("providerRegisteredQuoteLabel")} description={<PriceAmount loading={pricing.isLoading} value={registered?.providerQuotedDisplayPrice} fallback={t("priceUnavailable")} />} />
              </div>
            </MarketingCard>
          </div>

          <MarketingCard>
            <SectionLabel className="text-amber-700 dark:text-amber-400">
              {t("providerCardEyebrow")}
            </SectionLabel>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              {t("providerCardTitle")}
            </h3>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              {t("providerCardBody")}
            </p>
            <p className="mt-4 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
              {provider
                ? t("referenceCardBody", {
                    printedPages: provider.referenceScenario.printedPages,
                    physicalSheets: provider.referenceScenario.physicalSheets,
                    envelopeFormat: provider.referenceScenario.envelopeFormat,
                    standardPostage: getPostageLabel(t, provider.referenceScenario.standardPostage),
                    registeredPostage: getPostageLabel(t, provider.referenceScenario.registeredPostage),
                  })
                : t("referenceCardFallback")}
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <PricingRow label={t("providerPrintedPageLabel")} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.perPrintedPageCents) : undefined} fallback={t("priceUnavailable")} />} />
              <PricingRow label={t("providerPhysicalSheetLabel")} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.perA4SheetCents) : undefined} fallback={t("priceUnavailable")} />} />
              <PricingRow label={t("providerEnvelopeC5Label")} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.envelopeC5Cents) : undefined} fallback={t("priceUnavailable")} />} />
              <PricingRow label={t("providerStandardPostageLabel", { postage: provider ? getPostageLabel(t, provider.referenceScenario.standardPostage) : t("priceUnavailable") })} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.postageCents[provider.referenceScenario.standardPostage]) : undefined} fallback={t("priceUnavailable")} />} />
              <PricingRow label={t("providerRegisteredPostageLabel", { postage: provider ? getPostageLabel(t, provider.referenceScenario.registeredPostage) : t("priceUnavailable") })} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.postageCents[provider.referenceScenario.registeredPostage]) : undefined} fallback={t("priceUnavailable")} />} />
              <PricingRow label={t("providerFirstSheetSimplexLabel")} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.firstSheetC5Cents.simplexCents) : undefined} fallback={t("priceUnavailable")} />} />
              <PricingRow label={t("providerFirstSheetDuplexLabel")} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.firstSheetC5Cents.duplexCents) : undefined} fallback={t("priceUnavailable")} />} />
              <PricingRow label={t("providerExtraSheetSimplexLabel")} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.additionalA4SheetCents.simplexCents) : undefined} fallback={t("priceUnavailable")} />} />
              <PricingRow label={t("providerExtraSheetDuplexLabel")} price={<PriceAmount loading={pricing.isLoading} value={provider ? formatCentsAsCHF(provider.additionalA4SheetCents.duplexCents) : undefined} fallback={t("priceUnavailable")} />} />
            </div>
            <p className="mt-5 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
              {provider?.pricesExcludeVat ? t("providerVatNote") : t("vatIncludedNote")}
            </p>
          </MarketingCard>
        </div>
      </MarketingSection>
    </>
  );
}
```

```ts
// frontend/src/hooks/use-pricing.ts

/**
 * Fetch canonical pricing from the backend.
 *
 * The frontend never hardcodes prices. Marketing pages receive the same stored
 * pricing source used by the app, including freshness metadata for stale-state
 * messaging.
 *
 * Data is treated as fairly stable (5-minute stale time) because the backend
 * refreshes provider pricing through stored syncs rather than per-request quotes.
 */
```

```json
// frontend/src/messages/en-CH.json

"pricing": {
  "subtitle": "Current stored pricing, shown line by line.",
  "syncStatusTitle": "Pricing status",
  "syncFreshLabel": "Up to date",
  "syncFreshBody": "These prices come from the latest stored provider sync used by Swiss Mail.",
  "syncStaleLabel": "Sync delayed",
  "syncStaleBody": "These prices come from the last successful provider sync and may be outdated until the next update.",
  "syncSourceLabel": "Source: {source}",
  "syncUpdatedLabel": "Last updated: {date}",
  "summaryCardBody": "These are the standard and registered totals from the same stored pricing source used in the app.",
  "checkoutTruth": "In the app, Swiss Mail uses the same stored rates and calculates the exact total from your real pages, sheets, envelope, and delivery choice.",
  "serviceCardTitle": "What makes up the total",
  "serviceCardBody": "Swiss Mail adds its service fee on top of the stored provider totals. We show the line items directly instead of hiding them behind one headline number.",
  "providerCardTitle": "Provider unit rates",
  "providerCardBody": "These stored provider inputs explain the per-page, paper, envelope, and postage math behind the reference totals.",
  "includedDrafting": "Drafting assistance and structured review",
  "includedRendering": "Provider submission, reconciliation, and payment handling",
  "includedDispatch": "Receipt, confirmation, and support handling"
}
```

```json
// frontend/src/messages/de-CH.json

"pricing": {
  "subtitle": "Aktuelle gespeicherte Preise, Position für Position gezeigt.",
  "syncStatusTitle": "Preisstatus",
  "syncFreshLabel": "Aktuell",
  "syncFreshBody": "Diese Preise stammen aus dem neuesten gespeicherten Provider-Sync, den Swiss Mail verwendet.",
  "syncStaleLabel": "Sync verspätet",
  "syncStaleBody": "Diese Preise stammen aus dem letzten erfolgreichen Provider-Sync und können bis zum nächsten Update veraltet sein.",
  "syncSourceLabel": "Quelle: {source}",
  "syncUpdatedLabel": "Zuletzt aktualisiert: {date}",
  "summaryCardBody": "Dies sind die Standard- und Einschreiben-Totale aus derselben gespeicherten Preisquelle, die auch die App verwendet.",
  "checkoutTruth": "In der App verwendet Swiss Mail dieselben gespeicherten Tarife und berechnet den exakten Total aus Ihren tatsächlichen Seiten, Blättern, Couvert und Versandtyp.",
  "serviceCardTitle": "Woraus sich der Total zusammensetzt",
  "serviceCardBody": "Swiss Mail schlägt seine Servicegebühr auf die gespeicherten Provider-Totale auf. Wir zeigen die Positionen direkt, statt sie hinter einer einzigen Zahl zu verstecken.",
  "providerCardTitle": "Provider-Einheitspreise",
  "providerCardBody": "Diese gespeicherten Provider-Inputs erklären die Seiten-, Papier-, Couvert- und Portokalkulation hinter den Referenz-Totals.",
  "includedDrafting": "Drafting-Unterstützung und strukturierte Prüfung",
  "includedRendering": "Provider-Übermittlung, Reconciliation und Zahlungsabwicklung",
  "includedDispatch": "Beleg-, Bestätigungs- und Support-Abwicklung"
}
```

```json
// frontend/src/messages/fr-CH.json

"pricing": {
  "subtitle": "Tarifs stockés actuels, affichés ligne par ligne.",
  "syncStatusTitle": "Statut des tarifs",
  "syncFreshLabel": "À jour",
  "syncFreshBody": "Ces prix proviennent de la dernière synchronisation fournisseur stockée utilisée par Swiss Mail.",
  "syncStaleLabel": "Synchronisation en retard",
  "syncStaleBody": "Ces prix proviennent de la dernière synchronisation fournisseur réussie et peuvent être dépassés jusqu'à la prochaine mise à jour.",
  "syncSourceLabel": "Source : {source}",
  "syncUpdatedLabel": "Dernière mise à jour : {date}",
  "summaryCardBody": "Voici les totaux standard et recommandé issus de la même source tarifaire stockée que l'application.",
  "checkoutTruth": "Dans l'application, Swiss Mail utilise les mêmes tarifs stockés et calcule le total exact à partir de vos vraies pages, feuilles, enveloppe et du mode d'envoi choisi.",
  "serviceCardTitle": "Ce qui compose le total",
  "serviceCardBody": "Swiss Mail ajoute ses frais de service aux totaux fournisseur stockés. Nous affichons les postes directement au lieu de les cacher derrière un seul chiffre.",
  "providerCardTitle": "Tarifs unitaires du fournisseur",
  "providerCardBody": "Ces entrées fournisseur stockées expliquent le calcul par page, papier, enveloppe et affranchissement derrière les totaux de référence.",
  "includedDrafting": "Assistance à la rédaction et relecture structurée",
  "includedRendering": "Soumission au fournisseur, réconciliation et traitement du paiement",
  "includedDispatch": "Gestion du reçu, de la confirmation et du support"
}
```

```json
// frontend/src/messages/it-CH.json

"pricing": {
  "subtitle": "Prezzi memorizzati attuali, mostrati voce per voce.",
  "syncStatusTitle": "Stato dei prezzi",
  "syncFreshLabel": "Aggiornato",
  "syncFreshBody": "Questi prezzi provengono dall'ultima sincronizzazione fornitore memorizzata usata da Swiss Mail.",
  "syncStaleLabel": "Sincronizzazione in ritardo",
  "syncStaleBody": "Questi prezzi provengono dall'ultima sincronizzazione fornitore riuscita e possono essere superati fino al prossimo aggiornamento.",
  "syncSourceLabel": "Fonte: {source}",
  "syncUpdatedLabel": "Ultimo aggiornamento: {date}",
  "summaryCardBody": "Questi sono i totali standard e raccomandata provenienti dalla stessa fonte prezzi memorizzata usata nell'app.",
  "checkoutTruth": "Nell'app, Swiss Mail usa gli stessi prezzi memorizzati e calcola il totale esatto in base alle Sue pagine reali, ai fogli, alla busta e al tipo di invio scelto.",
  "serviceCardTitle": "Cosa compone il totale",
  "serviceCardBody": "Swiss Mail aggiunge la propria commissione di servizio ai totali del fornitore memorizzati. Mostriamo le voci direttamente invece di nasconderle dietro un solo numero.",
  "providerCardTitle": "Tariffe unitarie del fornitore",
  "providerCardBody": "Questi input del fornitore memorizzati spiegano il calcolo per pagina, carta, busta e affrancatura dietro i totali di riferimento.",
  "includedDrafting": "Assistenza alla redazione e revisione strutturata",
  "includedRendering": "Invio al fornitore, riconciliazione e gestione del pagamento",
  "includedDispatch": "Gestione di ricevuta, conferma e supporto"
}
```

- [ ] **Step 4: Run the pricing-page tests to verify they pass**

Run: `npm test -- frontend/tests/pricing-page.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the pricing-page rewrite**

```bash
git add frontend/src/components/marketing/PricingPageClient.tsx frontend/src/hooks/use-pricing.ts frontend/src/messages/en-CH.json frontend/src/messages/de-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json frontend/tests/pricing-page.test.ts
git commit -m "feat(frontend): rewrite pricing page around stored pricing" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Update the pricing docs so the stored snapshot is the source of truth

**Files:**
- Modify: `docs/04-product/pricing-structure.md`
- Modify: `docs/03-ux/page-specifications.md`
- Modify: `docs/03-ux/marketing-pages.md`

- [ ] **Step 1: Update the product pricing doc**

```md
<!-- docs/04-product/pricing-structure.md -->

## Objective

Define what checkout and public pricing must be truthful about when Swiss Mail prices letters from the stored provider pricing snapshot plus Swiss Mail markup.

### Locked MVP price model

The exact charged amount is:

1. stored provider pricing for the actual draft
2. plus a configurable Swiss Mail markup

Public pricing surfaces and the app must read from the same stored pricing source.
If the latest provider sync is stale, customer-facing pricing may remain visible only with explicit stale-state wording and the last sync timestamp.
```

- [ ] **Step 2: Update the `/pricing` route spec**

```md
<!-- docs/03-ux/page-specifications.md -->

#### 3.2 Pricing status banner
- Show source/provider label, last updated timestamp, and freshness state
- If freshness is `stale`, keep the last synced prices visible and show a prominent warning that the prices may be outdated until the next update

#### 3.3 Pricing cards
- One primary totals card: standard total, registered add-on, registered total
- One composition card: Swiss Mail service fee plus provider standard and registered reference totals
- One provider unit-rates card: printed page, physical A4 sheet, envelope, postage, first-sheet and extra-sheet math

### Error State
If no stored pricing snapshot exists: show a muted notice "Pricing information is temporarily unavailable. Please try again shortly." Do not fabricate prices.
```

- [ ] **Step 3: Update the marketing-page pricing doc**

```md
<!-- docs/03-ux/marketing-pages.md -->

### 5.1 Structure

| Section | Content |
|---------|---------|
| **Hero** | "Simple, honest pricing" plus the current stored pricing explanation |
| **Sync status** | Source, last updated timestamp, and fresh/stale state |
| **Totals card** | Standard total, registered add-on, registered total |
| **Breakdown** | Swiss Mail service fee, provider reference totals, and provider unit rates |
| **Comparison** | Standard vs registered wording and price |
| **FAQ** | Billing, refunds, receipts, CHF-only |
| **CTA** | Final CTA band |

### 5.2 Pricing content

- Sync banner shows source, last updated timestamp, and fresh/stale state
- Totals card shows standard total, registered add-on, and registered total
- Breakdown area shows Swiss Mail service fee, provider reference totals, and provider unit rates
- Provider-rate VAT wording must match the actual stored pricing data and must not claim "VAT included" if the provider inputs are stored excluding VAT

### 5.3 Comparison block

Use a standard-vs-registered comparison:

| Feature | Standard | Registered |
|---------|----------|------------|
| Service level wording | Standard postal delivery | Registered postal delivery |
| Provider reference / tracking | Only if the provider supplies it | Only if the provider supplies it |
| Confirmation wording | Never imply tracking by default | Stronger wording only after provider confirmation |
| Price | {formattedStandardPrice} | {formattedRegisteredPrice} |
```

- [ ] **Step 4: Commit the pricing docs**

```bash
git add docs/04-product/pricing-structure.md docs/03-ux/page-specifications.md docs/03-ux/marketing-pages.md
git commit -m "docs: align pricing docs with stored sync source" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Verify the pricing slice end to end

**Files:**
- No additional file edits expected

- [ ] **Step 1: Run the focused pricing suite**

```bash
npm test -- shared/tests/contracts.test.ts backend/tests/pricing.test.ts backend/tests/pricing-routes.test.ts frontend/tests/pricing-page.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the repository typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 3: Run the repository linter**

```bash
npm run lint
```

Expected: PASS

- [ ] **Step 4: Run the repository test suite**

```bash
npm test
```

Expected: PASS

---

## Self-review notes

- **Spec coverage:** Task 1 adds the sync contract. Task 2 moves `/v1/pricing` onto the stored source and adds the missing-snapshot failure. Task 3 rewrites the page structure, stale banner, and copy cleanup. Task 4 updates the pricing docs that currently still describe live-preview or simpler-card behavior. Task 5 verifies the slice and the repo.
- **Placeholder scan:** The only dependency note is the approved prerequisite: merge the pricing-sync/storage work before starting Task 2. The plan keeps the concrete local alias `readStoredPricingSnapshot` so the route wiring remains explicit once that prerequisite exists.
- **Type consistency:** The plan uses one sync shape throughout: `sourceLabel`, `lastSyncedAt`, `freshness`. Backend, shared, and frontend snippets all use the same property names.
