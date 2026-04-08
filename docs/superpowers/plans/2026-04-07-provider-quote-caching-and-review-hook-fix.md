# Provider Quote Caching and Review Hook Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep live provider pricing as checkout truth while adding a cached/precomputed pricing layer for review and checkout, removing static pricing drift, and fixing the ReviewPage hook-order crash safely.

**Architecture:** Add a backend-owned hybrid quote system with three layers: a versioned provider rate matrix for fast display pricing, a deterministic live quote cache keyed by pricing input hash, and the existing persisted payment breakdown for historical truth. Route pricing through one shared dispatch quote service, wire a DST-safe hourly refresh sentinel into BullMQ, and split ReviewPage into a thin shell plus a ready-state child so hook-heavy logic cannot drift below loading/error returns.

**Tech Stack:** Node.js, TypeScript, Fastify, Drizzle ORM, PostgreSQL, BullMQ, Next.js App Router, React Query, next-intl, Vitest, ESLint

---

## File map

- **Create:** `backend/drizzle/0004_dispatch_quote_cache_and_rate_matrix.sql` — migration for matrix-version, matrix-entry, and draft-quote-cache tables
- **Modify:** `backend/src/db/schema.ts` — Drizzle table definitions and enum additions for new quote persistence
- **Modify:** `backend/src/db/zod-schemas.ts` — generated insert/select helpers for the new pricing tables
- **Modify:** `shared/src/contracts/index.ts` — add a schema-backed quote response envelope with backend quote metadata
- **Modify:** `shared/tests/contracts.test.ts` — shared contract coverage for the new quote-response envelope
- **Modify:** `backend/tests/db-schema.test.ts` — schema coverage for the new pricing tables and enums
- **Create:** `backend/src/modules/dispatch/dispatch-pricing-input.service.ts` — canonical pricing-input builder + deterministic hash
- **Create:** `backend/src/modules/dispatch/dispatch-rate-matrix.service.ts` — active-matrix lookup, version creation, and atomic activation helpers
- **Create:** `backend/src/modules/dispatch/dispatch-quote-cache.service.ts` — live-quote cache lookup/store helpers
- **Modify:** `backend/src/modules/dispatch/dispatch-quote.service.ts` — orchestrate display vs payment quote resolution through shared services
- **Modify:** `backend/src/modules/dispatch/dispatch-package.service.ts` — expose the exact attachment/page inputs needed by pricing-input building without forcing snapshot-only pricing
- **Modify:** `backend/src/modules/dispatch/adapters/epost.adapter.ts` — keep provider preview pricing as the live quote path used by payment creation and matrix refresh probes
- **Create:** `backend/tests/dispatch-pricing-input.test.ts` — unit coverage for pricing-input normalization and hash stability
- **Modify:** `backend/tests/dispatch-quote.integration.test.ts` — integration coverage for first-review pricing without a snapshot and fallback to cached/live quote layers
- **Modify:** `backend/src/modules/payments/payment.routes.ts` — use display quote resolution for GET quote and payment quote resolution for checkout creation
- **Modify:** `backend/src/modules/drafting/draft.routes.ts` — stop using static `calculatePrice()` for preview/review payloads
- **Modify:** `backend/src/shared/config/env.ts` — add refresh/cache TTL env vars
- **Modify:** `backend/tests/env.test.ts` — env parsing coverage for new pricing-refresh settings
- **Modify:** `backend/src/queue/index.ts` — add pricing refresh queue/job type and register hourly sentinel
- **Modify:** `backend/src/workers/index.ts` — start the new pricing refresh worker
- **Create:** `backend/src/workers/refresh-dispatch-rates.worker.ts` — refresh active pricing matrix when stale/missing
- **Modify:** `backend/tests/dispatch-jobs.test.ts` — queue job ID and enqueue coverage for pricing refresh scheduling
- **Create:** `backend/tests/dispatch-rate-refresh.test.ts` — worker/service coverage for atomic version activation and stale-version fallback
- **Modify:** `frontend/src/hooks/use-dispatch-quote.ts` — parse the expanded quote-response envelope while preserving existing quote consumer behavior
- **Create:** `frontend/src/components/product/review/ReviewPageReady.tsx` — ready-state-only review UI with memo/callback hooks
- **Modify:** `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx` — thin loader shell that delegates to `ReviewPageReady`
- **Modify:** `frontend/tests/review-page.test.ts` — structural regression coverage for shell/ready-state separation
- **Modify:** `frontend/tests/checkout.test.ts` — checkout still shows quote-driven summary while payment-time failures stay blocking
- **Modify:** `package.json` — add `eslint-plugin-react-hooks` dev dependency
- **Modify:** `package-lock.json` — lockfile update for the new lint dependency
- **Modify:** `eslint.config.js` — enable React Hooks rules

---

### Task 1: Add the quote-response contract and pricing tables

**Files:**
- Modify: `shared/src/contracts/index.ts`
- Modify: `shared/tests/contracts.test.ts`
- Modify: `backend/src/db/schema.ts`
- Modify: `backend/src/db/zod-schemas.ts`
- Create: `backend/drizzle/0004_dispatch_quote_cache_and_rate_matrix.sql`
- Modify: `backend/tests/db-schema.test.ts`

- [ ] **Step 1: Write the failing shared/db schema tests**

```ts
// shared/tests/contracts.test.ts
import {
  DraftDispatchQuoteResponseSchema,
  DraftFilesResponseSchema,
  PublicPricingResponseSchema,
} from "../src/contracts/index.ts";

it("parses a dispatch quote response with backend quote metadata", () => {
  const result = DraftDispatchQuoteResponseSchema.parse({
    quote: {
      draftId: "11111111-1111-4111-8111-111111111111",
      snapshotId: "22222222-2222-4222-8222-222222222222",
      deliveryType: "registered",
      providerQuotedCents: 625,
      swissMailMarkupCents: 340,
      totalCents: 965,
      currency: "CHF",
      providerQuoteReference: "preview-123",
      attachmentHandling: "single_hint",
      lineItems: [
        { label: "ePost provider quote", amountCents: 625, source: "provider" },
        { label: "Swiss Mail service", amountCents: 340, source: "swiss_mail" },
      ],
    },
    meta: {
      source: "matrix",
      quotedAt: "2026-04-07T12:00:00.000Z",
      expiresAt: "2026-04-08T12:00:00.000Z",
    },
  });

  expect(result.meta.source).toBe("matrix");
  expect(result.quote.totalCents).toBe(965);
});
```

```ts
// backend/tests/db-schema.test.ts
import { describe, expect, it } from "vitest";
import { schema } from "../src/db/index.js";

describe("pricing quote persistence schema", () => {
  it("exports provider rate matrix tables", () => {
    expect(schema.providerRateMatrixVersions).toBeDefined();
    expect(schema.providerRateMatrixEntries).toBeDefined();
  });

  it("exports draft quote cache table", () => {
    expect(schema.draftQuoteCache).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the focused schema tests to verify they fail**

Run: `npm test -- shared/tests/contracts.test.ts backend/tests/db-schema.test.ts`

Expected: FAIL because `DraftDispatchQuoteResponseSchema`, `providerRateMatrixVersions`, `providerRateMatrixEntries`, and `draftQuoteCache` do not exist yet.

- [ ] **Step 3: Write the minimal shared contract and DB schema**

```ts
// shared/src/contracts/index.ts
import { z } from "zod";
import { DispatchQuoteSchema } from "../dispatch-provider.ts";

export const DraftDispatchQuoteMetaSchema = z.object({
  source: z.enum(["matrix", "live"]),
  quotedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
});

export const DraftDispatchQuoteResponseSchema = z.object({
  quote: DispatchQuoteSchema,
  meta: DraftDispatchQuoteMetaSchema,
});

export type DraftDispatchQuoteResponse = z.infer<typeof DraftDispatchQuoteResponseSchema>;
```

```ts
// backend/src/db/schema.ts
export const providerRateMatrixStatusEnum = pgEnum("provider_rate_matrix_status", [
  "building",
  "active",
  "failed",
  "retired",
]);

export const quoteSourceEnum = pgEnum("quote_source", ["matrix", "live"]);

export const providerRateMatrixVersions = pgTable("provider_rate_matrix_versions", {
  id: pk(),
  providerName: text("provider_name").notNull(),
  status: providerRateMatrixStatusEnum("status").notNull(),
  verifiedAt: ts("verified_at"),
  effectiveAt: ts("effective_at"),
  expiresAt: ts("expires_at"),
  sourceEndpoint: text("source_endpoint"),
  failureReason: text("failure_reason"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const providerRateMatrixEntries = pgTable("provider_rate_matrix_entries", {
  id: pk(),
  versionId: uuid("version_id").notNull().references(() => providerRateMatrixVersions.id),
  postage: text("postage").notNull(),
  numberOfPage: integer("number_of_page").notNull(),
  attachmentMode: text("attachment_mode").notNull(),
  shippingCountry: text("shipping_country").notNull(),
  envelopeSize: text("envelope_size").notNull(),
  windowLocation: text("window_location").notNull(),
  duplex: boolean("duplex").notNull(),
  providerQuotedCents: integer("provider_quoted_cents").notNull(),
  currency: text("currency").default("CHF").notNull(),
  providerQuoteReference: text("provider_quote_reference"),
  verifiedAt: ts("verified_at"),
  createdAt: createdAt(),
});

export const draftQuoteCache = pgTable("draft_quote_cache", {
  id: pk(),
  draftId: uuid("draft_id").notNull().references(() => draftLetters.id),
  snapshotId: uuid("snapshot_id").references(() => draftSnapshots.id),
  pricingInputHash: text("pricing_input_hash").notNull(),
  pricingInput: jsonb("pricing_input").notNull(),
  source: quoteSourceEnum("source").notNull(),
  deliveryType: deliveryTypeEnum("delivery_type").notNull(),
  postage: text("postage").notNull(),
  providerQuotedCents: integer("provider_quoted_cents").notNull(),
  swissMailMarkupCents: integer("swiss_mail_markup_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").default("CHF").notNull(),
  providerQuoteReference: text("provider_quote_reference"),
  rateMatrixVersionId: uuid("rate_matrix_version_id").references(() => providerRateMatrixVersions.id),
  generatedAt: ts("generated_at").notNull(),
  expiresAt: ts("expires_at"),
  createdAt: createdAt(),
});
```

```sql
-- backend/drizzle/0004_dispatch_quote_cache_and_rate_matrix.sql
CREATE TYPE provider_rate_matrix_status AS ENUM ('building', 'active', 'failed', 'retired');
CREATE TYPE quote_source AS ENUM ('matrix', 'live');

CREATE TABLE provider_rate_matrix_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  provider_name text NOT NULL,
  status provider_rate_matrix_status NOT NULL,
  verified_at timestamptz,
  effective_at timestamptz,
  expires_at timestamptz,
  source_endpoint text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE provider_rate_matrix_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  version_id uuid NOT NULL REFERENCES provider_rate_matrix_versions(id),
  postage text NOT NULL,
  number_of_page integer NOT NULL,
  attachment_mode text NOT NULL,
  shipping_country text NOT NULL,
  envelope_size text NOT NULL,
  window_location text NOT NULL,
  duplex boolean NOT NULL,
  provider_quoted_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CHF',
  provider_quote_reference text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE draft_quote_cache (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  draft_id uuid NOT NULL REFERENCES draft_letters(id),
  snapshot_id uuid REFERENCES draft_snapshots(id),
  pricing_input_hash text NOT NULL,
  pricing_input jsonb NOT NULL,
  source quote_source NOT NULL,
  delivery_type delivery_type NOT NULL,
  postage text NOT NULL,
  provider_quoted_cents integer NOT NULL,
  swiss_mail_markup_cents integer NOT NULL,
  total_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CHF',
  provider_quote_reference text,
  rate_matrix_version_id uuid REFERENCES provider_rate_matrix_versions(id),
  generated_at timestamptz NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX draft_quote_cache_input_hash_idx ON draft_quote_cache (pricing_input_hash, generated_at DESC);
CREATE INDEX provider_rate_matrix_entries_lookup_idx
  ON provider_rate_matrix_entries (version_id, postage, number_of_page, attachment_mode, shipping_country, envelope_size, window_location, duplex);
```

- [ ] **Step 4: Run the focused schema tests to verify they pass**

Run: `npm test -- shared/tests/contracts.test.ts backend/tests/db-schema.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the contract/schema groundwork**

```bash
git add shared/src/contracts/index.ts shared/tests/contracts.test.ts backend/src/db/schema.ts backend/src/db/zod-schemas.ts backend/drizzle/0004_dispatch_quote_cache_and_rate_matrix.sql backend/tests/db-schema.test.ts
git commit -m "feat(backend): add quote cache schema"
```

---

### Task 2: Add deterministic pricing-input building and quote-cache services

**Files:**
- Create: `backend/src/modules/dispatch/dispatch-pricing-input.service.ts`
- Create: `backend/src/modules/dispatch/dispatch-rate-matrix.service.ts`
- Create: `backend/src/modules/dispatch/dispatch-quote-cache.service.ts`
- Modify: `backend/src/modules/dispatch/dispatch-package.service.ts`
- Modify: `backend/src/modules/dispatch/dispatch-quote.service.ts`
- Create: `backend/tests/dispatch-pricing-input.test.ts`
- Modify: `backend/tests/dispatch-quote.integration.test.ts`

- [ ] **Step 1: Write the failing pricing-input and quote-resolution tests**

```ts
// backend/tests/dispatch-pricing-input.test.ts
import { describe, expect, it } from "vitest";
import {
  buildDispatchPricingInput,
  hashDispatchPricingInput,
} from "../src/modules/dispatch/dispatch-pricing-input.service.js";

describe("dispatch pricing input", () => {
  it("normalizes Swiss Mail's fixed pricing dimensions", () => {
    const input = buildDispatchPricingInput({
      draftId: "11111111-1111-4111-8111-111111111111",
      snapshotId: null,
      deliveryType: "registered",
      estimatedPages: 3,
      attachmentCount: 1,
      country: "CH",
    });

    expect(input).toMatchObject({
      postage: "REGISTERED",
      numberOfPage: 3,
      attachmentMode: "single_hint",
      shippingCountry: "CH",
      envelopeSize: "C5",
      windowLocation: "LEFT",
      duplex: false,
    });
  });

  it("derives a stable hash from pricing-relevant fields only", () => {
    const hash = hashDispatchPricingInput({
      deliveryType: "standard",
      postage: "A_POST",
      numberOfPage: 2,
      attachmentMode: "none",
      shippingCountry: "CH",
      envelopeSize: "C5",
      windowLocation: "LEFT",
      duplex: false,
    });

    expect(hash).toHaveLength(64);
  });
});
```

```ts
// backend/tests/dispatch-quote.integration.test.ts
it("can build a display quote for first review without requiring a snapshot", async () => {
  const { resolveDisplayDispatchQuoteForDraft } =
    await import("../src/modules/dispatch/dispatch-quote.service.js");

  const result = await resolveDisplayDispatchQuoteForDraft(harness.db, draftId);

  expect(result.meta.source).toBe("matrix");
  expect(result.quote.totalCents).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the dispatch-focused tests to verify they fail**

Run: `npm test -- backend/tests/dispatch-pricing-input.test.ts backend/tests/dispatch-quote.integration.test.ts`

Expected: FAIL because the pricing-input builder, hash helper, matrix lookup service, and display-quote resolver do not exist.

- [ ] **Step 3: Write the minimal pricing-input, matrix, and live-cache services**

```ts
// backend/src/modules/dispatch/dispatch-pricing-input.service.ts
import { createHash } from "node:crypto";
import { env } from "../../shared/config/index.js";

export interface DispatchPricingInput {
  deliveryType: "standard" | "registered";
  postage: string;
  numberOfPage: number;
  attachmentMode: "none" | "single_hint";
  shippingCountry: "CH";
  envelopeSize: "C5";
  windowLocation: "LEFT";
  duplex: false;
}

export function buildDispatchPricingInput(args: {
  draftId: string;
  snapshotId: string | null;
  deliveryType: "standard" | "registered";
  estimatedPages: number;
  attachmentCount: number;
  country: string;
}): DispatchPricingInput {
  return {
    deliveryType: args.deliveryType,
    postage:
      args.deliveryType === "registered"
        ? env().EPOST_REGISTERED_POSTAGE
        : env().EPOST_STANDARD_POSTAGE,
    numberOfPage: Math.max(1, Math.min(5, args.estimatedPages)),
    attachmentMode: args.attachmentCount > 0 ? "single_hint" : "none",
    shippingCountry: "CH",
    envelopeSize: "C5",
    windowLocation: "LEFT",
    duplex: false,
  };
}

export function hashDispatchPricingInput(input: DispatchPricingInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
```

```ts
// backend/src/modules/dispatch/dispatch-rate-matrix.service.ts
export async function getActiveMatrixQuote(
  db: Db,
  input: DispatchPricingInput,
): Promise<{ providerQuotedCents: number; versionId: string; quotedAt: Date; expiresAt: Date | null } | null> {
  const [row] = await db
    .select({
      versionId: schema.providerRateMatrixVersions.id,
      providerQuotedCents: schema.providerRateMatrixEntries.providerQuotedCents,
      quotedAt: schema.providerRateMatrixVersions.verifiedAt,
      expiresAt: schema.providerRateMatrixVersions.expiresAt,
    })
    .from(schema.providerRateMatrixEntries)
    .innerJoin(
      schema.providerRateMatrixVersions,
      eq(schema.providerRateMatrixEntries.versionId, schema.providerRateMatrixVersions.id),
    )
    .where(and(
      eq(schema.providerRateMatrixVersions.status, "active"),
      eq(schema.providerRateMatrixEntries.postage, input.postage),
      eq(schema.providerRateMatrixEntries.numberOfPage, input.numberOfPage),
      eq(schema.providerRateMatrixEntries.attachmentMode, input.attachmentMode),
      eq(schema.providerRateMatrixEntries.shippingCountry, input.shippingCountry),
      eq(schema.providerRateMatrixEntries.envelopeSize, input.envelopeSize),
      eq(schema.providerRateMatrixEntries.windowLocation, input.windowLocation),
      eq(schema.providerRateMatrixEntries.duplex, input.duplex),
    ))
    .limit(1);

  return row ?? null;
}
```

```ts
// backend/src/modules/dispatch/dispatch-quote-cache.service.ts
export async function getFreshLiveQuoteByHash(db: Db, pricingInputHash: string, now = new Date()) {
  const [row] = await db
    .select()
    .from(schema.draftQuoteCache)
    .where(and(
      eq(schema.draftQuoteCache.pricingInputHash, pricingInputHash),
      eq(schema.draftQuoteCache.source, "live"),
      or(isNull(schema.draftQuoteCache.expiresAt), gt(schema.draftQuoteCache.expiresAt, now)),
    ))
    .orderBy(desc(schema.draftQuoteCache.generatedAt))
    .limit(1);

  return row ?? null;
}

export async function storeResolvedQuote(db: Db, values: {
  draftId: string;
  snapshotId: string | null;
  pricingInputHash: string;
  pricingInput: DispatchPricingInput;
  source: "matrix" | "live";
  deliveryType: "standard" | "registered";
  postage: string;
  providerQuotedCents: number;
  swissMailMarkupCents: number;
  totalCents: number;
  providerQuoteReference: string | null;
  rateMatrixVersionId: string | null;
  generatedAt: Date;
  expiresAt: Date | null;
}) {
  await db.insert(schema.draftQuoteCache).values(values);
}
```

```ts
// backend/src/modules/dispatch/dispatch-quote.service.ts
export async function resolveDisplayDispatchQuoteForDraft(db: Db, draftId: string) {
  const source = await buildPricingSourceForDraft(db, draftId, { requireSnapshot: false });
  return resolveDispatchQuoteFromCacheOrMatrix(db, source, { purpose: "display" });
}

export async function resolvePaymentDispatchQuoteForDraft(db: Db, draftId: string) {
  const source = await buildPricingSourceForDraft(db, draftId, { requireSnapshot: false });
  return resolveDispatchQuoteFromCacheOrLiveProvider(db, source);
}
```

- [ ] **Step 4: Run the dispatch-focused tests to verify they pass**

Run: `npm test -- backend/tests/dispatch-pricing-input.test.ts backend/tests/dispatch-quote.integration.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the pricing-input and cache services**

```bash
git add backend/src/modules/dispatch/dispatch-pricing-input.service.ts backend/src/modules/dispatch/dispatch-rate-matrix.service.ts backend/src/modules/dispatch/dispatch-quote-cache.service.ts backend/src/modules/dispatch/dispatch-package.service.ts backend/src/modules/dispatch/dispatch-quote.service.ts backend/tests/dispatch-pricing-input.test.ts backend/tests/dispatch-quote.integration.test.ts
git commit -m "feat(backend): add dispatch quote cache services"
```

---

### Task 3: Add the hourly pricing refresh sentinel and worker

**Files:**
- Modify: `backend/src/shared/config/env.ts`
- Modify: `backend/tests/env.test.ts`
- Modify: `backend/src/queue/index.ts`
- Modify: `backend/src/workers/index.ts`
- Create: `backend/src/workers/refresh-dispatch-rates.worker.ts`
- Modify: `backend/tests/dispatch-jobs.test.ts`
- Create: `backend/tests/dispatch-rate-refresh.test.ts`

- [ ] **Step 1: Write the failing env/queue/worker tests**

```ts
// backend/tests/env.test.ts
it("parses dispatch pricing refresh settings", async () => {
  const { loadEnv, env } = await import("../src/shared/config/index.js");

  process.env.DISPATCH_RATE_MATRIX_TTL_HOURS = "24";
  process.env.LIVE_DISPATCH_QUOTE_TTL_MINUTES = "30";

  loadEnv();

  expect(env().DISPATCH_RATE_MATRIX_TTL_HOURS).toBe(24);
  expect(env().LIVE_DISPATCH_QUOTE_TTL_MINUTES).toBe(30);
});
```

```ts
// backend/tests/dispatch-jobs.test.ts
it("registers an hourly pricing refresh sentinel job", async () => {
  const { registerScheduledJobs } = await import("../src/queue/index.js");

  await registerScheduledJobs();

  expect(add).toHaveBeenCalledWith(
    "scheduled-rate-refresh-sentinel",
    { reason: "stale_matrix" },
    expect.objectContaining({
      jobId: "scheduled-rate-refresh-sentinel",
      repeat: { pattern: "5 * * * *" },
    }),
  );
});
```

- [ ] **Step 2: Run the queue/env tests to verify they fail**

Run: `npm test -- backend/tests/env.test.ts backend/tests/dispatch-jobs.test.ts`

Expected: FAIL because the new env vars, queue name, job payload, and repeatable sentinel do not exist yet.

- [ ] **Step 3: Write the minimal env + queue + worker implementation**

```ts
// backend/src/shared/config/env.ts
DISPATCH_RATE_MATRIX_TTL_HOURS: z.coerce.number().int().positive().default(24),
LIVE_DISPATCH_QUOTE_TTL_MINUTES: z.coerce.number().int().positive().default(30),
```

```ts
// backend/src/queue/index.ts
export const QUEUE_NAMES = {
  RENDER_PDF: "render-pdf",
  SUBMIT_DISPATCH: "submit-dispatch",
  RECONCILE_DISPATCH: "reconcile-ambiguous-dispatch",
  SEND_EMAIL: "send-transactional-email",
  CLEANUP_ASSETS: "cleanup-expired-assets",
  REFRESH_DISPATCH_RATES: "refresh-dispatch-rates",
} as const;

export interface RefreshDispatchRatesJob {
  reason: "stale_matrix";
}

export async function registerScheduledJobs(): Promise<void> {
  const cleanupQueue = getQueue(QUEUE_NAMES.CLEANUP_ASSETS);
  await cleanupQueue.add("scheduled-cleanup", { batchSize: 100 }, {
    repeat: { pattern: "0 * * * *" },
    jobId: "scheduled-cleanup",
  });

  const refreshQueue = getQueue(QUEUE_NAMES.REFRESH_DISPATCH_RATES);
  await refreshQueue.add(
    "scheduled-rate-refresh-sentinel",
    { reason: "stale_matrix" } satisfies RefreshDispatchRatesJob,
    {
      repeat: { pattern: "5 * * * *" },
      jobId: "scheduled-rate-refresh-sentinel",
    },
  );
}
```

```ts
// backend/src/workers/refresh-dispatch-rates.worker.ts
import { createWorker, QUEUE_NAMES, type RefreshDispatchRatesJob } from "../queue/index.js";
import { getDb } from "../db/index.js";
import { refreshDispatchRateMatrixIfNeeded } from "../modules/dispatch/dispatch-rate-matrix.service.js";

export function startRefreshDispatchRatesWorker() {
  return createWorker<RefreshDispatchRatesJob>(
    QUEUE_NAMES.REFRESH_DISPATCH_RATES,
    async () => {
      await refreshDispatchRateMatrixIfNeeded(getDb(), new Date());
    },
  );
}
```

```ts
// backend/src/workers/index.ts
import { startRefreshDispatchRatesWorker } from "./refresh-dispatch-rates.worker.js";

const refreshDispatchRatesWorker = startRefreshDispatchRatesWorker();

workers.push(
  emailWorker,
  renderPdfWorker,
  submitDispatchWorker,
  reconcileDispatchWorker,
  cleanupAssetsWorker,
  refreshDispatchRatesWorker,
);
```

- [ ] **Step 4: Add the rate-refresh worker test and run the pricing-refresh suite**

```ts
// backend/tests/dispatch-rate-refresh.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/modules/dispatch/dispatch-rate-matrix.service.js", () => ({
  refreshDispatchRateMatrixIfNeeded: vi.fn(),
}));

it("refresh worker delegates to refreshDispatchRateMatrixIfNeeded", async () => {
  const { refreshDispatchRateMatrixIfNeeded } =
    await import("../src/modules/dispatch/dispatch-rate-matrix.service.js");
  const { startRefreshDispatchRatesWorker } =
    await import("../src/workers/refresh-dispatch-rates.worker.js");

  const worker = startRefreshDispatchRatesWorker();
  expect(worker.name).toBe("refresh-dispatch-rates");
  expect(refreshDispatchRateMatrixIfNeeded).not.toHaveBeenCalled();
  await worker.close();
});
```

Run: `npm test -- backend/tests/env.test.ts backend/tests/dispatch-jobs.test.ts backend/tests/dispatch-rate-refresh.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the pricing refresh infrastructure**

```bash
git add backend/src/shared/config/env.ts backend/tests/env.test.ts backend/src/queue/index.ts backend/src/workers/index.ts backend/src/workers/refresh-dispatch-rates.worker.ts backend/tests/dispatch-jobs.test.ts backend/tests/dispatch-rate-refresh.test.ts
git commit -m "feat(backend): add pricing refresh worker"
```

---

### Task 4: Route quotes through the new resolver and remove static preview/review pricing drift

**Files:**
- Modify: `backend/src/modules/payments/payment.routes.ts`
- Modify: `backend/src/modules/drafting/draft.routes.ts`
- Modify: `backend/tests/dispatch-quote.integration.test.ts`
- Create: `backend/tests/checkout-quote-reuse.test.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
// backend/tests/checkout-quote-reuse.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const paymentRoutesSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/payments/payment.routes.ts"),
  "utf8",
);

describe("checkout quote routing", () => {
  it("uses the payment quote resolver instead of the old direct dispatch helper", () => {
    expect(paymentRoutesSource).toContain("resolvePaymentDispatchQuoteForDraft");
    expect(paymentRoutesSource).not.toContain(
      "const quote = await getDispatchQuoteForDraft(db, draftId);",
    );
  });
});
```

```ts
// backend/tests/dispatch-quote.integration.test.ts
it("returns preview price from the shared quote resolver instead of calculatePrice", async () => {
  const response = await app.inject({
    method: "GET",
    url: `/api/v1/drafts/${draftId}/preview`,
    headers: sessionHeaders,
  });

  expect(response.statusCode).toBe(200);
  expect(response.json().preview.priceCents).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npm test -- backend/tests/dispatch-quote.integration.test.ts backend/tests/checkout-quote-reuse.test.ts`

Expected: FAIL because checkout still calls `getDispatchQuoteForDraft()` directly and draft preview/review still use `calculatePrice()`.

- [ ] **Step 3: Write the minimal route integration**

```ts
// backend/src/modules/payments/payment.routes.ts
import {
  resolveDisplayDispatchQuoteForDraft,
  resolvePaymentDispatchQuoteForDraft,
} from "../dispatch/dispatch-quote.service.js";

const resolvedDisplayQuote = await resolveDisplayDispatchQuoteForDraft(db, draftId);
reply.send({
  quote: resolvedDisplayQuote.quote,
  meta: resolvedDisplayQuote.meta,
});

const resolvedPaymentQuote = await resolvePaymentDispatchQuoteForDraft(db, draftId);
const amountCents = resolvedPaymentQuote.quote.totalCents;

breakdown: {
  deliveryType: resolvedPaymentQuote.quote.deliveryType,
  providerQuotedCents: resolvedPaymentQuote.quote.providerQuotedCents,
  swissMailMarkupCents: resolvedPaymentQuote.quote.swissMailMarkupCents,
  totalCents: resolvedPaymentQuote.quote.totalCents,
  providerQuoteReference: resolvedPaymentQuote.quote.providerQuoteReference,
  attachmentHandling: resolvedPaymentQuote.quote.attachmentHandling,
  lineItems: resolvedPaymentQuote.quote.lineItems,
},
```

```ts
// backend/src/modules/drafting/draft.routes.ts
import { resolveDisplayDispatchQuoteForDraft } from "../dispatch/dispatch-quote.service.js";

const resolvedDisplayQuote = await resolveDisplayDispatchQuoteForDraft(db, draftId);

reply.send({
  preview: {
    draftId: draft.id,
    snapshotId: latestSnapshot?.id ?? null,
    locale: snapshotData?.locale ?? draft.locale,
    deliveryType,
    subject: snapshotData?.subject ?? draft.subject,
    body: snapshotData?.body ?? draft.body,
    enclosureNote: snapshotData?.enclosureNote ?? draft.enclosureNote,
    sender: snapshotData?.sender ?? sender,
    recipient: snapshotData?.recipient ?? recipient,
    signatureMode: snapshotData?.signatureMode ?? draft.signatureMode,
    signatureFileId,
    attachmentCount,
    priceCents: resolvedDisplayQuote.quote.totalCents,
    updatedAt: snapshotData ? latestSnapshot!.createdAt.toISOString() : draft.updatedAt.toISOString(),
  },
});
```

- [ ] **Step 4: Run the route tests to verify they pass**

Run: `npm test -- backend/tests/dispatch-quote.integration.test.ts backend/tests/checkout-quote-reuse.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the route integration**

```bash
git add backend/src/modules/payments/payment.routes.ts backend/src/modules/drafting/draft.routes.ts backend/tests/dispatch-quote.integration.test.ts backend/tests/checkout-quote-reuse.test.ts
git commit -m "feat(backend): route pricing through quote resolver"
```

---

### Task 5: Split ReviewPage into a shell and ready-state component

**Files:**
- Create: `frontend/src/components/product/review/ReviewPageReady.tsx`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`
- Modify: `frontend/src/hooks/use-dispatch-quote.ts`
- Modify: `frontend/tests/review-page.test.ts`
- Modify: `frontend/tests/checkout.test.ts`

- [ ] **Step 1: Write the failing frontend regression tests**

```ts
// frontend/tests/review-page.test.ts
const reviewReadySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/review/ReviewPageReady.tsx"),
  "utf8",
);

it("keeps the route file as a thin shell and moves hook-heavy ready logic into ReviewPageReady", () => {
  expect(reviewPageSource).toContain("<ReviewPageReady");
  expect(reviewPageSource).not.toContain("const reviewSummaryItems = useMemo");
  expect(reviewPageSource).not.toContain("const handleProceedToPayment = useCallback");
  expect(reviewReadySource).toContain("const reviewSummaryItems = useMemo");
  expect(reviewReadySource).toContain("const handleProceedToPayment = useCallback");
});
```

```ts
// frontend/tests/checkout.test.ts
it("keeps checkout blocked on payment creation failures even when pricing is already present", () => {
  expect(checkoutPageSource).toContain("showCheckoutBlockedState");
  expect(checkoutPageSource).toContain('t("pricingBlockedEnvironmentBody")');
});
```

- [ ] **Step 2: Run the frontend review/checkout tests to verify they fail**

Run: `npm test -- frontend/tests/review-page.test.ts frontend/tests/checkout.test.ts`

Expected: FAIL because `ReviewPageReady.tsx` does not exist and the route file still declares hook-heavy ready-state logic below loading/error returns.

- [ ] **Step 3: Write the minimal shell + ready-state implementation**

```tsx
// frontend/src/components/product/review/ReviewPageReady.tsx
"use client";

import { useCallback, useMemo } from "react";

export function ReviewPageReady({
  draftId,
  draft,
  preview,
  attachments,
  quote,
}: ReviewPageReadyProps) {
  const d = draft.data!;
  const alreadyPrepared = ["reviewed", "rendering", "ready", "submitted", "dispatched"].includes(
    d.status,
  );
  const reviewActionState = useReviewPrimaryActionState({
    allComplete,
    alreadyPrepared,
    hasQuote: Boolean(quote.data),
    hasQuoteError: quote.isError,
    isQuoteLoading: quote.isLoading,
    isSubmitting: reviewDraft.isPending || updateDraft.isPending,
  });
  const reviewSummaryItems = useMemo<ReviewSummaryItem[]>(() => {
    return [
      { label: t("senderDetails"), value: senderLines, emptyLabel: preview.isLoading ? tc("loading") : t("requiredBeforeSending") },
      { label: t("recipientDetails"), value: recipientLines, emptyLabel: preview.isLoading ? tc("loading") : t("requiredBeforeSending") },
      { label: t("signature"), value: hasSignature ? t("uploadedSignature") : t("noSignature") },
      { label: t("attachments"), value: hasAttachments ? t("attachmentCount", { count: attachmentCount }) : t("noAttachments") },
    ];
  }, [attachmentCount, hasAttachments, hasSignature, preview.isLoading, recipientLines, senderLines, t, tc]);

  const handleProceedToPayment = useCallback(() => {
    if (!reviewActionState.canProceed) return;
    if (alreadyPrepared) {
      router.push(`/draft/${draftId}/checkout`);
      return;
    }

    void reviewDraft.mutateAsync().then(() => {
      router.push(`/draft/${draftId}/checkout`);
    });
  }, [alreadyPrepared, draftId, reviewActionState.canProceed, reviewDraft, router]);

  return (
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
      <FlowHeader currentStep={1} draftId={draftId} title={t("title")} headerAction={desktopStepAction} />
      <main className="mx-auto max-w-7xl space-y-8 px-4 pb-[calc(12rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:pb-[calc(12rem+env(safe-area-inset-bottom))]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="app-panel-muted rounded-[2rem] p-4 sm:p-5">
            <LetterPreview
              draft={previewDraft}
              senderProfile={preview.previewData?.sender}
              recipientProfile={preview.previewData?.recipient}
              signatureMode={hasSignature ? signatureMode : null}
              signatureUrl={hasSignature ? signatureUrl : null}
              showHeader={false}
            />
          </section>
          <aside className="space-y-6 lg:sticky lg:top-28">
            <ReviewSummaryCard
              title={t("summaryTitle")}
              description={t("reviewReadOnly")}
              statusTone={allComplete ? "success" : "warning"}
              statusLabel={allComplete ? t("readyToSend") : t("needsAttention")}
              items={reviewSummaryItems}
            />
            <PriceSummary
              draftId={draftId}
              deliveryType={displayDeliveryType}
              subject={displaySubject}
              quoteEnabled={canRequestQuote}
              pendingLabel={allComplete ? t("pricingPending") : t("requiredBeforeSending")}
              loadingMessage={t("calculatingPriceDetail")}
            />
          </aside>
        </div>
      </main>
      <FlowActionDock primaryAction={<ActionButton onClick={handleProceedToPayment}>{t("proceedToPayment")}</ActionButton>} />
    </div>
  );
}
```

```tsx
// frontend/src/app/[locale]/draft/[draftId]/review/page.tsx
import { ReviewPageReady } from "../../../../../components/product/review/ReviewPageReady";

export default function ReviewPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  const t = useTranslations("review");
  const tc = useTranslations("common");
  const draft = useDraft(draftId);
  const preview = useLetterPreview(draftId);
  const { attachments } = useDraftFiles(draftId);
  const quote = useDispatchQuote(draftId, Boolean(draft.data));

  if (draft.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">{tc("error")}</p>
      </div>
    );
  }

  return (
    <ReviewPageReady
      draftId={draftId}
      draft={draft}
      preview={preview}
      attachments={attachments}
      quote={quote}
    />
  );
}
```

```ts
// frontend/src/hooks/use-dispatch-quote.ts
import { DraftDispatchQuoteResponseSchema } from "@swiss-mail/shared";

queryFn: () =>
  apiFetch(`/v1/drafts/${draftId}/quote`).then((response) =>
    DraftDispatchQuoteResponseSchema.parse(response).quote,
  ),
```

- [ ] **Step 4: Run the frontend review/checkout tests to verify they pass**

Run: `npm test -- frontend/tests/review-page.test.ts frontend/tests/checkout.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the ReviewPage structural fix**

```bash
git add frontend/src/components/product/review/ReviewPageReady.tsx frontend/src/app/[locale]/draft/[draftId]/review/page.tsx frontend/src/hooks/use-dispatch-quote.ts frontend/tests/review-page.test.ts frontend/tests/checkout.test.ts
git commit -m "fix(frontend): split review page ready state"
```

---

### Task 6: Enable React Hooks lint rules and run the focused verification suite

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `eslint.config.js`

- [ ] **Step 1: Add the failing lint guard by enabling React Hooks rules**

```js
// eslint.config.js
import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);
```

- [ ] **Step 2: Install the lint dependency and verify lockfile/package changes**

Run: `npm install -D eslint-plugin-react-hooks`

Expected: `package.json` and `package-lock.json` update to include `eslint-plugin-react-hooks`.

- [ ] **Step 3: Run the focused lint/test suite**

Run: `npm run lint -- eslint.config.js frontend/src/app/[locale]/draft/[draftId]/review/page.tsx frontend/src/components/product/review/ReviewPageReady.tsx backend/src/modules/payments/payment.routes.ts backend/src/modules/drafting/draft.routes.ts`

Expected: PASS

Run: `npm test -- shared/tests/contracts.test.ts backend/tests/db-schema.test.ts backend/tests/dispatch-pricing-input.test.ts backend/tests/dispatch-quote.integration.test.ts backend/tests/env.test.ts backend/tests/dispatch-jobs.test.ts backend/tests/dispatch-rate-refresh.test.ts backend/tests/checkout-quote-reuse.test.ts frontend/tests/review-page.test.ts frontend/tests/checkout.test.ts`

Expected: PASS

- [ ] **Step 4: Run the repo-wide safety checks**

Run: `npm run typecheck && npm run lint && npm test`

Expected: PASS

- [ ] **Step 5: Commit the lint guard and final integrated slice**

```bash
git add package.json package-lock.json eslint.config.js
git commit -m "chore: enforce react hooks lint rules"
```

---

## Self-review checklist

- Spec coverage: Tasks 1-4 cover the hybrid quote architecture, storage model, refresh strategy, and removal of static preview/review pricing drift. Tasks 5-6 cover the ReviewPage hook-order fix, lint guardrails, and verification.
- Placeholder scan: no `TODO`, `TBD`, or “implement later” placeholders remain; every task names exact files, commands, and code fragments.
- Type consistency: the plan uses one shared `DraftDispatchQuoteResponseSchema`, one `DispatchPricingInput` shape, one `pricingInputHash`, and one queue name `REFRESH_DISPATCH_RATES` across later tasks.
