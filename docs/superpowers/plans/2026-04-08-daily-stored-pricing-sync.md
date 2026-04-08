# Daily Stored Pricing Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a provider-backed daily stored pricing matrix for all non-checkout display pricing, keep checkout on the live draft-specific provider quote, and add a one-off seed command that loads prices immediately after deployment or repair.

**Architecture:** Reuse the existing `provider_rate_matrix_versions` and `provider_rate_matrix_entries` tables as the single stored display-pricing source. Add a dedicated sync service plus adapter reference-pricing probe, schedule that sync daily through BullMQ, expose the same sync path through a backend script, and refactor preview/public display pricing to read stored matrix data only, including stale last-successful data when a refresh misses.

**Tech Stack:** TypeScript, Fastify, BullMQ, Drizzle ORM, Vitest, ePost adapter, Node/tsx scripts

---

## File structure

| File | Responsibility |
| --- | --- |
| `backend/src/modules/dispatch/dispatch-rate-matrix-sync.service.ts` | Build canonical pricing probes and sync a full versioned matrix from the adapter |
| `backend/src/modules/dispatch/dispatch-rate-matrix.service.ts` | Read fresh-or-stale stored matrix rows for display pricing |
| `backend/src/modules/dispatch/adapters/postal.adapter.ts` | Declare `quoteReferencePrice()` on the adapter boundary and keep stub behavior explicit |
| `backend/src/modules/dispatch/adapters/epost.adapter.ts` | Implement the ePost preview-pricing reference probe |
| `backend/src/workers/refresh-dispatch-rates.worker.ts` | Execute the real sync service in the queue worker |
| `backend/src/queue/index.ts` | Register the daily repeatable refresh job using env-backed cron config |
| `backend/src/shared/config/env.ts` | Add `DISPATCH_RATE_MATRIX_REFRESH_CRON` |
| `backend/src/scripts/refresh-dispatch-rates.ts` | Manual one-off seed command that runs the same sync service |
| `backend/package.json` | Add `dispatch:refresh-rates` script |
| `backend/src/modules/dispatch/dispatch-quote.service.ts` | Resolve stored display quotes from the matrix, including stale last-successful versions |
| `backend/src/modules/drafting/draft.routes.ts` | Replace blank-draft preview `calculatePrice()` fallback with a stored reference quote |
| `backend/src/modules/pricing/index.ts` | Stop exporting runtime display-pricing helpers if nothing production-facing still uses them |
| `backend/tests/dispatch-rate-matrix-sync.service.test.ts` | TDD coverage for canonical probe generation, activation, and failure retention |
| `backend/tests/dispatch-rate-matrix.service.test.ts` | TDD coverage for fresh/stale stored-matrix reads |
| `backend/tests/epost-reference-pricing.test.ts` | TDD coverage for `EpostDispatchAdapter.quoteReferencePrice()` |
| `backend/tests/workers.test.ts` | Queue schedule regression coverage |
| `backend/tests/dispatch-jobs.test.ts` | Repeatable refresh job wiring regression coverage |
| `backend/tests/dispatch-quote.integration.test.ts` | Blank-draft preview regression coverage for stored reference pricing |
| `docs/04-product/pricing-structure.md` | Document stored daily matrix for display pricing and live quote for checkout |
| `docs/07-operations/deployment-and-ci.md` | Document the cron env key and manual seed command |

---

### Task 1: Build the canonical matrix sync service

**Files:**
- Create: `backend/src/modules/dispatch/dispatch-rate-matrix-sync.service.ts`
- Create: `backend/tests/dispatch-rate-matrix-sync.service.test.ts`
- Modify: `backend/src/modules/dispatch/adapters/postal.adapter.ts`

- [ ] **Step 1: Write the failing sync-service test**

```ts
import { describe, expect, it, vi } from "vitest";

import type { DispatchPricingInput } from "../src/modules/dispatch/dispatch-pricing-input.service.js";
import { syncDispatchRateMatrix } from "../src/modules/dispatch/dispatch-rate-matrix-sync.service.js";

function createSyncDbHarness() {
  const state = {
    insertedEntries: [] as Array<{
      postage: string;
      numberOfPage: number;
      attachmentMode: string;
    }>,
    retiredVersionIds: [] as string[],
    failedVersionUpdates: [] as Array<{ failureReason: string }>,
  };

  const db = {
    transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        insert: vi.fn(() => ({
          values: vi.fn(async (value: unknown) => {
            if (Array.isArray(value)) {
              state.insertedEntries.push(...(value as typeof state.insertedEntries));
            }
            return value;
          }),
        })),
        update: vi.fn(() => ({
          set: vi.fn((value: Record<string, unknown>) => ({
            where: vi.fn(async () => {
              if (value.status === "retired") {
                state.retiredVersionIds.push("old-active");
              }
              if (value.status === "failed") {
                state.failedVersionUpdates.push({
                  failureReason: String(value.failureReason ?? ""),
                });
              }
            }),
          })),
        })),
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(async () => [{ id: "old-active", status: "active" }]),
          })),
        })),
      }),
    ),
  };

  return { db: db as never, state };
}

describe("syncDispatchRateMatrix", () => {
  it("builds all 20 canonical pricing probes and activates the completed version", async () => {
    const { db, state } = createSyncDbHarness();
    const quoteReferencePrice = vi.fn(async (input: DispatchPricingInput) => ({
      providerQuotedCents: input.numberOfPage * 100,
      providerQuoteReference: null,
      quotedAt: new Date("2026-04-08T06:05:00.000Z"),
    }));

    const result = await syncDispatchRateMatrix({
      db,
      adapter: { quoteReferencePrice } as never,
      now: new Date("2026-04-08T06:05:00.000Z"),
    });

    expect(quoteReferencePrice).toHaveBeenCalledTimes(20);
    expect(state.insertedEntries).toHaveLength(20);
    expect(state.retiredVersionIds).toEqual(["old-active"]);
    expect(result.entryCount).toBe(20);
  });

  it("marks the attempted version failed and keeps the previous active version when a probe fails", async () => {
    const { db, state } = createSyncDbHarness();
    const quoteReferencePrice = vi
      .fn()
      .mockResolvedValueOnce({
        providerQuotedCents: 495,
        providerQuoteReference: null,
        quotedAt: new Date("2026-04-08T06:05:00.000Z"),
      })
      .mockRejectedValueOnce(new Error("preview failed"));

    await expect(
      syncDispatchRateMatrix({
        db,
        adapter: { quoteReferencePrice } as never,
        now: new Date("2026-04-08T06:05:00.000Z"),
      }),
    ).rejects.toThrow("preview failed");

    expect(state.retiredVersionIds).toEqual([]);
    expect(state.failedVersionUpdates).toEqual([
      { failureReason: "preview failed" },
    ]);
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `npm test -- backend/tests/dispatch-rate-matrix-sync.service.test.ts`

Expected: FAIL with `Cannot find module '../src/modules/dispatch/dispatch-rate-matrix-sync.service.js'` and a TypeScript error because `quoteReferencePrice` is not yet on the adapter contract.

- [ ] **Step 3: Implement the canonical sync service and adapter contract**

```ts
// backend/src/modules/dispatch/adapters/postal.adapter.ts
import type { DispatchPricingInput } from "../dispatch-pricing-input.service.js";

export interface DispatchAdapter {
  getCapabilities(): DispatchProviderCapabilities;
  quoteReferencePrice(input: DispatchPricingInput): Promise<{
    providerQuotedCents: number;
    providerQuoteReference: string | null;
    quotedAt: Date | null;
  }>;
  quotePrice(dispatchPackage: DispatchPackage): Promise<DispatchQuote>;
  submit(dispatchPackage: DispatchPackage): Promise<DispatchSubmitResult>;
  checkStatus(providerReference: string): Promise<DispatchStatusLookup>;
}

class StubDispatchAdapter implements DispatchAdapter {
  getCapabilities(): DispatchProviderCapabilities {
    return getStubDispatchCapabilities();
  }

  async quoteReferencePrice(): Promise<never> {
    throw new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "DISPATCH_ADAPTER_NOT_CONFIGURED",
      message: "Postal reference pricing is unavailable because the dispatch adapter is running in stub mode.",
      userMessage: "Stored postal pricing is unavailable in this environment.",
      userAction: "Use an environment with postal dispatch enabled.",
    });
  }

  // keep quotePrice / submit / checkStatus as they are
}
```

```ts
// backend/src/modules/dispatch/dispatch-rate-matrix-sync.service.ts
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import type { DispatchAdapter } from "./adapters/postal.adapter.js";
import { getDispatchAdapter } from "./adapters/postal.adapter.js";
import type { DispatchPricingInput } from "./dispatch-pricing-input.service.js";

const CANONICAL_PAGE_COUNTS = [1, 2, 3, 4, 5] as const;
const CANONICAL_ATTACHMENT_MODES = ["none", "single_hint"] as const;

export function buildCanonicalRateMatrixInputs(config = env()): DispatchPricingInput[] {
  return [
    { deliveryType: "standard", postage: config.EPOST_STANDARD_POSTAGE },
    { deliveryType: "registered", postage: config.EPOST_REGISTERED_POSTAGE },
  ].flatMap(({ deliveryType, postage }) =>
    CANONICAL_ATTACHMENT_MODES.flatMap((attachmentMode) =>
      CANONICAL_PAGE_COUNTS.map((numberOfPage) => ({
        deliveryType,
        postage,
        numberOfPage,
        attachmentMode,
        shippingCountry: "CH" as const,
        envelopeSize: "C5" as const,
        windowLocation: "LEFT" as const,
        duplex: false as const,
      })),
    ),
  );
}

export async function syncDispatchRateMatrix(args: {
  db: Db;
  adapter?: DispatchAdapter;
  now?: Date;
}) {
  const { db, adapter = getDispatchAdapter(), now = new Date() } = args;
  const config = env();
  const versionId = randomUUID();
  const expiresAt = new Date(
    now.getTime() + config.DISPATCH_RATE_MATRIX_TTL_HOURS * 60 * 60 * 1000,
  );
  const inputs = buildCanonicalRateMatrixInputs(config);

  await db.insert(schema.providerRateMatrixVersions).values({
    id: versionId,
    providerName: "epost",
    status: "building",
    sourceEndpoint: `${config.EPOST_API_BASE_URL}/epost/preview/delivery-prices`,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const entries = [];
    for (const input of inputs) {
      const quote = await adapter.quoteReferencePrice(input);
      entries.push({
        id: randomUUID(),
        versionId,
        postage: input.postage,
        numberOfPage: input.numberOfPage,
        attachmentMode: input.attachmentMode,
        shippingCountry: input.shippingCountry,
        envelopeSize: input.envelopeSize,
        windowLocation: input.windowLocation,
        duplex: input.duplex,
        providerQuotedCents: quote.providerQuotedCents,
        currency: "CHF",
        providerQuoteReference: quote.providerQuoteReference,
        verifiedAt: quote.quotedAt ?? now,
        createdAt: now,
      });
    }

    if (entries.length !== inputs.length) {
      throw new Error(`expected ${inputs.length} matrix entries but built ${entries.length}`);
    }

    await db.transaction(async (tx) => {
      await tx.insert(schema.providerRateMatrixEntries).values(entries);
      await tx
        .update(schema.providerRateMatrixVersions)
        .set({ status: "retired", updatedAt: now })
        .where(
          and(
            eq(schema.providerRateMatrixVersions.status, "active"),
            eq(schema.providerRateMatrixVersions.providerName, "epost"),
          ),
        );
      await tx
        .update(schema.providerRateMatrixVersions)
        .set({
          status: "active",
          verifiedAt: now,
          effectiveAt: now,
          expiresAt,
          updatedAt: now,
        })
        .where(eq(schema.providerRateMatrixVersions.id, versionId));
    });

    return { versionId, entryCount: entries.length, expiresAt };
  } catch (error) {
    await db
      .update(schema.providerRateMatrixVersions)
      .set({
        status: "failed",
        failureReason: error instanceof Error ? error.message : String(error),
        updatedAt: now,
      })
      .where(eq(schema.providerRateMatrixVersions.id, versionId));

    throw error;
  }
}
```

- [ ] **Step 4: Run the sync-service test and verify it passes**

Run: `npm test -- backend/tests/dispatch-rate-matrix-sync.service.test.ts`

Expected: PASS with both `syncDispatchRateMatrix` cases green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/dispatch/adapters/postal.adapter.ts \
        backend/src/modules/dispatch/dispatch-rate-matrix-sync.service.ts \
        backend/tests/dispatch-rate-matrix-sync.service.test.ts
git commit -m "feat(dispatch): add stored rate matrix sync service" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Add the ePost reference-pricing probe

**Files:**
- Create: `backend/tests/epost-reference-pricing.test.ts`
- Modify: `backend/src/modules/dispatch/adapters/epost.adapter.ts`

- [ ] **Step 1: Write the failing ePost adapter test**

```ts
import { describe, expect, it, vi } from "vitest";

import { getEpostDispatchCapabilities } from "../src/modules/dispatch/adapters/provider-capabilities.js";
import { EpostDispatchAdapter } from "../src/modules/dispatch/adapters/epost.adapter.js";

describe("EpostDispatchAdapter.quoteReferencePrice", () => {
  it("returns the PHYSICAL preview price in cents for canonical pricing inputs", async () => {
    const adapter = new EpostDispatchAdapter(getEpostDispatchCapabilities());

    vi.spyOn(adapter as any, "requestJson").mockResolvedValue({ id: "preview-123" });
    vi.spyOn(adapter as any, "pollPreviewResult").mockResolvedValue({
      pricePreview: [
        {
          potentialPrices: [{ channel: "PHYSICAL", price: 6.25 }],
        },
      ],
    });

    const result = await adapter.quoteReferencePrice({
      deliveryType: "registered",
      postage: "REGISTERED",
      numberOfPage: 1,
      attachmentMode: "single_hint",
      shippingCountry: "CH",
      envelopeSize: "C5",
      windowLocation: "LEFT",
      duplex: false,
    });

    expect((adapter as any).requestJson).toHaveBeenCalledWith(
      "/epost/preview/delivery-prices",
      expect.objectContaining({ method: "POST" }),
      "preview pricing",
    );
    expect(result).toEqual({
      providerQuotedCents: 625,
      providerQuoteReference: "preview-123",
      quotedAt: null,
    });
  });
});
```

- [ ] **Step 2: Run the adapter test and verify it fails**

Run: `npm test -- backend/tests/epost-reference-pricing.test.ts`

Expected: FAIL because `quoteReferencePrice()` does not yet exist on `EpostDispatchAdapter`.

- [ ] **Step 3: Implement `quoteReferencePrice()` in the ePost adapter**

```ts
// backend/src/modules/dispatch/adapters/epost.adapter.ts
import type { DispatchPricingInput } from "../dispatch-pricing-input.service.js";

const REFERENCE_PROBE_SENDER = {
  firstName: "Swiss",
  lastName: "Mail",
  company: "Swiss Mail",
  addressLine1: "Bahnhofstrasse 1",
  postalCode: "8001",
  city: "Zurich",
  country: "CH" as const,
  email: null,
  phone: null,
};

const REFERENCE_PROBE_RECIPIENT = {
  firstName: "Pricing",
  lastName: "Probe",
  company: null,
  addressLine1: "Rue du Rhone 1",
  postalCode: "1204",
  city: "Geneva",
  country: "CH" as const,
  email: null,
  phone: null,
};

function buildReferencePricingMetadata(input: DispatchPricingInput): JsonRecord {
  const physicalAdditionalInfo: JsonRecord = {
    shippingCountry: input.shippingCountry,
    envelopeSize: input.envelopeSize,
    postage: input.postage,
    windowLocation: input.windowLocation,
    duplex: input.duplex,
    numberOfPage: input.numberOfPage,
    senderAddress: buildSenderAddress(REFERENCE_PROBE_SENDER),
  };

  if (input.attachmentMode === "single_hint") {
    physicalAdditionalInfo.attachment = "reference-attachment.pdf";
  }

  return {
    fileMetadata: [
      {
        fileName: "reference-pricing.pdf",
        deliveryChannelPreferences: ["PHYSICAL"],
        recipients: [
          {
            senderUserId: "pricing-reference-probe",
            allCredentialShouldMatch: true,
            unhashedCredentials: {
              firstName: REFERENCE_PROBE_RECIPIENT.firstName,
              lastName: REFERENCE_PROBE_RECIPIENT.lastName,
              street: "Rue du Rhone",
              streetNumber: "1",
              zipCode: REFERENCE_PROBE_RECIPIENT.postalCode,
              city: REFERENCE_PROBE_RECIPIENT.city,
            },
          },
        ],
        senderName: getPartyDisplayName(REFERENCE_PROBE_SENDER),
        senderEndToEndId: "pricing-reference-probe",
        senderCaseId: "pricing-reference-probe",
        documentTitle: "reference-pricing",
        documentTypes: ["message"],
        physicalAdditionalInfo,
      },
    ],
  };
}

export class EpostDispatchAdapter {
  // existing constructor and helpers stay

  async quoteReferencePrice(input: DispatchPricingInput): Promise<{
    providerQuotedCents: number;
    providerQuoteReference: string | null;
    quotedAt: Date | null;
  }> {
    const created = (await this.requestJson(
      "/epost/preview/delivery-prices",
      {
        method: "POST",
        body: createJsonFormData(buildReferencePricingMetadata(input)),
      },
      "preview pricing",
    )) as JsonRecord;

    const previewId = typeof created.id === "string" ? created.id : null;
    if (!previewId) {
      throw providerOutageError(
        "Pricing preview creation did not return a usable id for stored pricing refresh.",
      );
    }

    const preview = await this.pollPreviewResult(previewId);
    const pricePreview = Array.isArray(preview.pricePreview)
      ? (preview.pricePreview[0] as JsonRecord | undefined)
      : undefined;
    const potentialPrices = Array.isArray(pricePreview?.potentialPrices)
      ? pricePreview.potentialPrices
      : [];
    const physicalPrice = potentialPrices.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        (candidate as JsonRecord).channel === "PHYSICAL",
    ) as JsonRecord | undefined;
    const providerPriceRaw = physicalPrice?.price;

    if (typeof providerPriceRaw !== "number") {
      throw providerOutageError(
        extractErrorMessage(physicalPrice) ??
          "Stored pricing refresh did not receive a physical-letter preview price.",
      );
    }

    return {
      providerQuotedCents: Math.round(providerPriceRaw * 100),
      providerQuoteReference: previewId,
      quotedAt: null,
    };
  }
}
```

- [ ] **Step 4: Run the adapter and sync tests together**

Run: `npm test -- backend/tests/epost-reference-pricing.test.ts backend/tests/dispatch-rate-matrix-sync.service.test.ts`

Expected: PASS with the new adapter probe test plus the sync service tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/dispatch/adapters/epost.adapter.ts \
        backend/tests/epost-reference-pricing.test.ts
git commit -m "feat(dispatch): add epost reference pricing probe" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Schedule the daily refresh and add the manual seed command

**Files:**
- Modify: `backend/src/shared/config/env.ts`
- Modify: `backend/src/queue/index.ts`
- Modify: `backend/src/workers/refresh-dispatch-rates.worker.ts`
- Modify: `backend/tests/workers.test.ts`
- Modify: `backend/tests/dispatch-jobs.test.ts`
- Create: `backend/src/scripts/refresh-dispatch-rates.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Write the failing schedule and command regressions**

```ts
// backend/tests/dispatch-jobs.test.ts
vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    REDIS_URL: "redis://localhost:6379",
    DISPATCH_RATE_MATRIX_REFRESH_CRON: "5 6 * * *",
  }),
}));

it("registers a daily pricing refresh job from env config", async () => {
  const { registerScheduledJobs } = await import("../src/queue/index.js");

  await registerScheduledJobs();

  expect(add).toHaveBeenCalledWith(
    "scheduled-rate-refresh-sentinel",
    { reason: "stale_matrix" },
    expect.objectContaining({
      jobId: "scheduled-rate-refresh-sentinel",
      repeat: { pattern: "5 6 * * *" },
    }),
  );
});
```

```ts
// backend/tests/workers.test.ts
it("registers the cleanup job hourly and the rate refresh job from config", async () => {
  await registerScheduledJobs();
  expect(addSpy).toHaveBeenCalledWith(
    "scheduled-cleanup",
    { batchSize: 100 },
    expect.objectContaining({ repeat: { pattern: "0 * * * *" } }),
  );
  expect(addSpy).toHaveBeenCalledWith(
    "scheduled-rate-refresh-sentinel",
    { reason: "stale_matrix" },
    expect.objectContaining({ repeat: { pattern: "5 6 * * *" } }),
  );
});
```

- [ ] **Step 2: Run the schedule tests and verify they fail**

Run: `npm test -- backend/tests/workers.test.ts backend/tests/dispatch-jobs.test.ts`

Expected: FAIL because `env().DISPATCH_RATE_MATRIX_REFRESH_CRON` does not exist and the queue still uses the hourly `5 * * * *` pattern.

- [ ] **Step 3: Implement the daily cron env key, worker wiring, and manual script**

```ts
// backend/src/shared/config/env.ts
DISPATCH_RATE_MATRIX_REFRESH_CRON: z.string().min(1).default("5 6 * * *"),
```

```ts
// backend/src/queue/index.ts
await refreshQueue.add(
  "scheduled-rate-refresh-sentinel",
  { reason: "stale_matrix" } satisfies RefreshDispatchRatesJob,
  {
    repeat: { pattern: env().DISPATCH_RATE_MATRIX_REFRESH_CRON },
    jobId: "scheduled-rate-refresh-sentinel",
  },
);
```

```ts
// backend/src/workers/refresh-dispatch-rates.worker.ts
import { syncDispatchRateMatrix } from "../modules/dispatch/dispatch-rate-matrix-sync.service.js";

export function startRefreshDispatchRatesWorker() {
  return createWorker<RefreshDispatchRatesJob>(
    QUEUE_NAMES.REFRESH_DISPATCH_RATES,
    async () => {
      logger.info("Starting dispatch rate matrix refresh");
      const result = await syncDispatchRateMatrix({ db: getDb() });
      logger.info({ result }, "Dispatch rate matrix refresh complete");
    },
    { concurrency: 1 },
  );
}
```

```ts
// backend/src/scripts/refresh-dispatch-rates.ts
import { loadEnv } from "../shared/config/index.js";
import { closeDb, getDb } from "../db/index.js";
import { syncDispatchRateMatrix } from "../modules/dispatch/dispatch-rate-matrix-sync.service.js";

loadEnv();

try {
  const result = await syncDispatchRateMatrix({ db: getDb() });
  console.log(
    JSON.stringify(
      {
        versionId: result.versionId,
        entryCount: result.entryCount,
        expiresAt: result.expiresAt.toISOString(),
      },
      null,
      2,
    ),
  );
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await closeDb();
}
```

```json
// backend/package.json
{
  "scripts": {
    "dispatch:refresh-rates": "tsx src/scripts/refresh-dispatch-rates.ts"
  }
}
```

- [ ] **Step 4: Run the schedule tests again**

Run: `npm test -- backend/tests/workers.test.ts backend/tests/dispatch-jobs.test.ts`

Expected: PASS with the daily `5 6 * * *` refresh pattern coming from env.

- [ ] **Step 5: Commit**

```bash
git add backend/src/shared/config/env.ts \
        backend/src/queue/index.ts \
        backend/src/workers/refresh-dispatch-rates.worker.ts \
        backend/src/scripts/refresh-dispatch-rates.ts \
        backend/package.json \
        backend/tests/workers.test.ts \
        backend/tests/dispatch-jobs.test.ts
git commit -m "feat(dispatch): schedule and script stored rate refresh" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Refactor display pricing to use stored matrix data only

**Files:**
- Modify: `backend/src/modules/dispatch/dispatch-rate-matrix.service.ts`
- Modify: `backend/src/modules/dispatch/dispatch-quote.service.ts`
- Modify: `backend/src/modules/drafting/draft.routes.ts`
- Modify: `backend/src/modules/pricing/index.ts`
- Modify: `backend/tests/dispatch-rate-matrix.service.test.ts`
- Modify: `backend/tests/dispatch-quote.integration.test.ts`

- [ ] **Step 1: Write the failing fresh/stale read and blank-draft preview tests**

```ts
// backend/tests/dispatch-rate-matrix.service.test.ts
import { describe, expect, it, vi } from "vitest";

import {
  getStoredMatrixQuote,
  getStoredReferenceDisplayQuote,
} from "../src/modules/dispatch/dispatch-rate-matrix.service.js";

describe("stored matrix reads", () => {
  it("returns a stale stored quote for display pricing when the last successful matrix has expired", async () => {
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([
              {
                id: "matrix-1",
                status: "active",
                verifiedAt: new Date("2026-04-07T06:05:00.000Z"),
                effectiveAt: new Date("2026-04-07T06:05:00.000Z"),
                expiresAt: new Date("2026-04-08T05:00:00.000Z"),
                providerName: "epost",
                sourceEndpoint: "https://api.epost.ch/epost/preview/delivery-prices",
                createdAt: new Date("2026-04-07T06:05:00.000Z"),
                updatedAt: new Date("2026-04-07T06:05:00.000Z"),
              },
            ]),
          })),
        }))
        .mockImplementationOnce(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    versionId: "matrix-1",
                    providerQuotedCents: 578,
                    quotedAt: new Date("2026-04-07T06:05:00.000Z"),
                    expiresAt: new Date("2026-04-08T05:00:00.000Z"),
                  },
                ]),
              })),
            })),
          })),
        })),
    };

    const result = await getStoredMatrixQuote(
      db as never,
      {
        deliveryType: "registered",
        postage: "REGISTERED",
        numberOfPage: 1,
        attachmentMode: "none",
        shippingCountry: "CH",
        envelopeSize: "C5",
        windowLocation: "LEFT",
        duplex: false,
      },
      new Date("2026-04-08T06:05:00.000Z"),
    );

    expect(result?.providerQuotedCents).toBe(578);
    expect(result?.freshness).toBe("stale");
  });

  it("returns the stored one-page no-attachment quote for blank-draft preview pricing", async () => {
    const result = await getStoredReferenceDisplayQuote(
      {
        select: vi.fn(),
      } as never,
      "registered",
      new Date("2026-04-08T06:05:00.000Z"),
    );

    expect(result.deliveryType).toBe("registered");
  });
});
```

```ts
// backend/tests/dispatch-quote.integration.test.ts
it("uses the stored reference quote for blank-draft preview pricing instead of calculatePrice", async () => {
  const dispatchQuoteService = await import("../src/modules/dispatch/dispatch-quote.service.js");

  vi.mocked(
    dispatchQuoteService.resolveReferenceDisplayQuoteForDeliveryType,
  ).mockResolvedValueOnce({
    quote: {
      draftId: "preview-draft",
      snapshotId: null,
      deliveryType: "registered",
      providerQuotedCents: 155,
      swissMailMarkupCents: 340,
      totalCents: 495,
      currency: "CHF",
      lineItems: [],
      providerQuoteReference: null,
      attachmentHandling: "excluded",
    },
    meta: {
      source: "matrix",
      quotedAt: new Date("2026-04-08T06:05:00.000Z"),
      expiresAt: new Date("2026-04-09T06:05:00.000Z"),
    },
  });

  const response = await app.inject({
    method: "GET",
    url: "/drafts/preview-draft/preview",
  });

  expect(response.statusCode).toBe(200);
  expect(response.json().preview.priceCents).toBe(495);
});
```

- [ ] **Step 2: Run the display-pricing tests and verify they fail**

Run: `npm test -- backend/tests/dispatch-rate-matrix.service.test.ts backend/tests/dispatch-quote.integration.test.ts`

Expected: FAIL because stale matrix reads are currently filtered out, `getStoredReferenceDisplayQuote()` does not exist, and blank-draft preview still imports `calculatePrice()`.

- [ ] **Step 3: Implement stored-matrix reads and remove runtime `calculatePrice()` usage**

```ts
// backend/src/modules/dispatch/dispatch-rate-matrix.service.ts
import { and, desc, eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import type { DispatchPricingInput } from "./dispatch-pricing-input.service.js";

export async function getStoredMatrixQuote(
  db: Db,
  input: DispatchPricingInput,
  now = new Date(),
): Promise<
  | {
      versionId: string;
      providerQuotedCents: number;
      quotedAt: Date | null;
      expiresAt: Date | null;
      freshness: "fresh" | "stale";
    }
  | null
> {
  const [version] = await db
    .select({
      id: schema.providerRateMatrixVersions.id,
      verifiedAt: schema.providerRateMatrixVersions.verifiedAt,
      effectiveAt: schema.providerRateMatrixVersions.effectiveAt,
      expiresAt: schema.providerRateMatrixVersions.expiresAt,
      createdAt: schema.providerRateMatrixVersions.createdAt,
      updatedAt: schema.providerRateMatrixVersions.updatedAt,
      providerName: schema.providerRateMatrixVersions.providerName,
      sourceEndpoint: schema.providerRateMatrixVersions.sourceEndpoint,
      status: schema.providerRateMatrixVersions.status,
    })
    .from(schema.providerRateMatrixVersions)
    .where(eq(schema.providerRateMatrixVersions.status, "active"))
    .orderBy(
      desc(schema.providerRateMatrixVersions.verifiedAt),
      desc(schema.providerRateMatrixVersions.createdAt),
    )
    .limit(1);

  if (!version) return null;

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
      eq(
        schema.providerRateMatrixEntries.versionId,
        schema.providerRateMatrixVersions.id,
      ),
    )
    .where(
      and(
        eq(schema.providerRateMatrixVersions.id, version.id),
        eq(schema.providerRateMatrixEntries.postage, input.postage),
        eq(schema.providerRateMatrixEntries.numberOfPage, input.numberOfPage),
        eq(schema.providerRateMatrixEntries.attachmentMode, input.attachmentMode),
        eq(schema.providerRateMatrixEntries.shippingCountry, input.shippingCountry),
        eq(schema.providerRateMatrixEntries.envelopeSize, input.envelopeSize),
        eq(schema.providerRateMatrixEntries.windowLocation, input.windowLocation),
        eq(schema.providerRateMatrixEntries.duplex, input.duplex),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    freshness:
      row.expiresAt && row.expiresAt.getTime() > now.getTime() ? "fresh" : "stale",
  };
}

export async function getStoredReferenceDisplayQuote(
  db: Db,
  deliveryType: "standard" | "registered",
  now = new Date(),
) {
  const input = {
    deliveryType,
    postage:
      deliveryType === "registered"
        ? env().EPOST_REGISTERED_POSTAGE
        : env().EPOST_STANDARD_POSTAGE,
    numberOfPage: 1,
    attachmentMode: "none" as const,
    shippingCountry: "CH" as const,
    envelopeSize: "C5" as const,
    windowLocation: "LEFT" as const,
    duplex: false as const,
  };

  const row = await getStoredMatrixQuote(db, input, now);
  if (!row) {
    return null;
  }

  return {
    deliveryType,
    providerQuotedCents: row.providerQuotedCents,
    quotedAt: row.quotedAt,
    expiresAt: row.expiresAt,
    freshness: row.freshness,
  };
}
```

```ts
// backend/src/modules/dispatch/dispatch-quote.service.ts
import {
  getStoredMatrixQuote,
  getStoredReferenceDisplayQuote,
} from "./dispatch-rate-matrix.service.js";

async function resolveDispatchQuoteFromStoredMatrix(
  db: Db,
  source: PricingSource,
): Promise<ResolvedDispatchQuote> {
  const matrixRow = await getStoredMatrixQuote(db, source.pricingInput);
  if (!matrixRow) {
    throw validationError("Pricing is not available yet. Please try again shortly.");
  }

  const cfg = env();
  const swissMailMarkupCents =
    source.deliveryType === "registered"
      ? cfg.PRICE_REGISTERED_MARKUP_CENTS
      : cfg.PRICE_STANDARD_MARKUP_CENTS;

  return {
    quote: {
      draftId: source.draftId,
      snapshotId: source.snapshotId,
      deliveryType: source.deliveryType,
      providerQuotedCents: matrixRow.providerQuotedCents,
      swissMailMarkupCents,
      totalCents: matrixRow.providerQuotedCents + swissMailMarkupCents,
      currency: "CHF",
      lineItems: [
        { label: "Provider quote", amountCents: matrixRow.providerQuotedCents, source: "provider" },
        { label: "Swiss Mail service", amountCents: swissMailMarkupCents, source: "swiss_mail" },
      ],
      providerQuoteReference: null,
      attachmentHandling:
        source.pricingInput.attachmentMode === "single_hint" ? "single_hint" : "excluded",
    },
    meta: {
      source: "matrix",
      quotedAt: matrixRow.quotedAt,
      expiresAt: matrixRow.expiresAt,
    },
  };
}

export async function resolveReferenceDisplayQuoteForDeliveryType(
  db: Db,
  deliveryType: "standard" | "registered",
): Promise<ResolvedDispatchQuote> {
  const stored = await getStoredReferenceDisplayQuote(db, deliveryType);
  if (!stored) {
    throw validationError("Pricing is not available yet. Please try again shortly.");
  }

  const swissMailMarkupCents =
    deliveryType === "registered"
      ? env().PRICE_REGISTERED_MARKUP_CENTS
      : env().PRICE_STANDARD_MARKUP_CENTS;

  return {
    quote: {
      draftId: "reference-display-price",
      snapshotId: null,
      deliveryType,
      providerQuotedCents: stored.providerQuotedCents,
      swissMailMarkupCents,
      totalCents: stored.providerQuotedCents + swissMailMarkupCents,
      currency: "CHF",
      lineItems: [],
      providerQuoteReference: null,
      attachmentHandling: "excluded",
    },
    meta: {
      source: "matrix",
      quotedAt: stored.quotedAt,
      expiresAt: stored.expiresAt,
    },
  };
}

export async function resolveDisplayDispatchQuoteForDraft(
  db: Db,
  draftId: string,
): Promise<ResolvedDispatchQuote> {
  const source = await buildPricingSourceForDraft(db, draftId);
  return resolveDispatchQuoteFromStoredMatrix(db, source);
}
```

```ts
// backend/src/modules/drafting/draft.routes.ts
import {
  resolveDisplayDispatchQuoteForDraft,
  resolveReferenceDisplayQuoteForDeliveryType,
} from "../dispatch/dispatch-quote.service.js";

const resolvedDisplayQuote = shouldUseReferencePrice
  ? await resolveReferenceDisplayQuoteForDeliveryType(db, deliveryType)
  : await resolveDisplayDispatchQuoteForDraft(db, draftId);
```

```ts
// backend/src/modules/pricing/index.ts
export { formatCHF, getPublicPricing } from "./public-pricing.service.js";
```

- [ ] **Step 4: Run the display-pricing tests again**

Run: `npm test -- backend/tests/dispatch-rate-matrix.service.test.ts backend/tests/dispatch-quote.integration.test.ts backend/tests/pricing.test.ts backend/tests/pricing-routes.test.ts`

Expected: PASS, with stale stored-matrix reads accepted for display surfaces and blank-draft preview no longer depending on `calculatePrice()`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/dispatch/dispatch-rate-matrix.service.ts \
        backend/src/modules/dispatch/dispatch-quote.service.ts \
        backend/src/modules/drafting/draft.routes.ts \
        backend/src/modules/pricing/index.ts \
        backend/tests/dispatch-rate-matrix.service.test.ts \
        backend/tests/dispatch-quote.integration.test.ts
git commit -m "fix(pricing): use stored matrix for display quotes" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Update docs, run the manual seed, and verify the full repo

**Files:**
- Modify: `docs/04-product/pricing-structure.md`
- Modify: `docs/07-operations/deployment-and-ci.md`

- [ ] **Step 1: Update the pricing and ops docs**

```md
<!-- docs/04-product/pricing-structure.md -->
- Public pricing surfaces and in-product display totals read from the latest stored synced provider matrix.
- Checkout still uses the live draft-specific provider quote for the actual charged amount.
- If only a stale last-successful matrix exists, display pricing may still be shown from that stored matrix.
```

```md
<!-- docs/07-operations/deployment-and-ci.md -->
| `DISPATCH_RATE_MATRIX_REFRESH_CRON` | Daily BullMQ cron for stored provider pricing refresh | `5 6 * * *` |

- Seed stored pricing after deploy or repair with:
  `docker compose exec -T backend npm run dispatch:refresh-rates -w backend`
- Verify the active matrix with:
  `docker compose exec -T postgres psql -U swissmail -d swissmail -c "SELECT COUNT(*) AS versions, COUNT(*) FILTER (WHERE status = 'active') AS active_versions FROM provider_rate_matrix_versions;"`
```

- [ ] **Step 2: Run the targeted backend tests**

Run: `npm test -- backend/tests/dispatch-rate-matrix-sync.service.test.ts backend/tests/epost-reference-pricing.test.ts backend/tests/workers.test.ts backend/tests/dispatch-jobs.test.ts backend/tests/dispatch-rate-matrix.service.test.ts backend/tests/dispatch-quote.integration.test.ts backend/tests/pricing.test.ts backend/tests/pricing-routes.test.ts`

Expected: PASS across the stored pricing sync, adapter, queue, display quote, and public pricing regressions.

- [ ] **Step 3: Run the manual seed command in the dev stack**

Run: `docker compose exec -T backend npm run dispatch:refresh-rates -w backend`

Expected: PASS with JSON output that includes a new `versionId`, `entryCount: 20`, and a future `expiresAt`.

- [ ] **Step 4: Verify that stored pricing now exists and the public pricing route reads it**

Run: `docker compose exec -T postgres psql -U swissmail -d swissmail -c "SELECT COUNT(*) AS versions, COUNT(*) FILTER (WHERE status = 'active') AS active_versions FROM provider_rate_matrix_versions; SELECT COUNT(*) AS entries FROM provider_rate_matrix_entries;" && curl -sk https://ark-fid.ddns.net/api/v1/pricing | jq '.sync'`

Expected:
- the SQL output shows at least `1` active version and `20` entries for the seeded matrix
- the pricing route returns a `sync` object instead of `PRICING_UNAVAILABLE`

- [ ] **Step 5: Run the full repo verification under Node 20**

Run: `npx -y -p node@20.19.0 -c 'node -v && npm run lint && npm run typecheck && npm test && npm run build'`

Expected: PASS for lint, typecheck, tests, and build under Node `v20.19.0`.

- [ ] **Step 6: Commit**

```bash
git add docs/04-product/pricing-structure.md docs/07-operations/deployment-and-ci.md
git commit -m "docs: document stored pricing refresh flow" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Self-review checklist

- Spec coverage:
  - daily stored matrix sync -> Tasks 1, 2, and 3
  - display-only stored pricing with live checkout -> Task 4
  - manual one-off seed command -> Task 3 and Task 5
  - targeted cleanup of legacy runtime display pricing -> Task 4
  - docs and ops updates -> Task 5
- Placeholder scan:
  - no `TODO`, `TBD`, or “similar to Task N” shortcuts remain
  - every code step includes concrete code or commands
- Type consistency:
  - adapter method name is `quoteReferencePrice`
  - sync entrypoint is `syncDispatchRateMatrix`
  - stored display helper names are `getStoredMatrixQuote`, `getStoredReferenceDisplayQuote`, and `resolveReferenceDisplayQuoteForDeliveryType`
