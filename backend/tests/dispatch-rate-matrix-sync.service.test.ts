import { describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
    DISPATCH_RATE_MATRIX_TTL_HOURS: 24,
    EPOST_API_BASE_URL: "https://api.epost.ch",
  }),
}));

import type { DispatchPricingInput } from "../src/modules/dispatch/dispatch-pricing-input.service.js";
import { syncDispatchRateMatrix } from "../src/modules/dispatch/dispatch-rate-matrix-sync.service.js";

type SyncDbTx = {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function createSyncDbHarness(options?: { transactionError?: Error }) {
  const state = {
    insertedBuildingVersions: [] as Array<{ status: string; sourceEndpoint: string }>,
    insertedEntries: [] as Array<{
      postage: string;
      numberOfPage: number;
      attachmentMode: string;
    }>,
    retiredVersionIds: [] as string[],
    failedVersionUpdates: [] as Array<{ failureReason: string }>,
  };

  const rootInsertValues = vi.fn(async (value: unknown) => {
    if (!Array.isArray(value) && value && typeof value === "object") {
      state.insertedBuildingVersions.push(
        value as (typeof state.insertedBuildingVersions)[number],
      );
    }

    return value;
  });

  const rootUpdateWhere = vi.fn(async () => undefined);
  const rootUpdateSet = vi.fn((value: Record<string, unknown>) => ({
    where: rootUpdateWhere.mockImplementation(async () => {
      if (value.status === "failed") {
        state.failedVersionUpdates.push({
          failureReason: String(value.failureReason ?? ""),
        });
      }
    }),
  }));

  const db = {
    insert: vi.fn(() => ({
      values: rootInsertValues,
    })),
    update: vi.fn(() => ({
      set: rootUpdateSet,
    })),
    transaction: vi.fn(async (callback: (tx: SyncDbTx) => Promise<unknown>) => {
      if (options?.transactionError) {
        throw options.transactionError;
      }

      return callback({
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
            }),
          })),
        })),
      });
    }),
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
    expect(state.insertedBuildingVersions).toHaveLength(1);
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
    expect(state.failedVersionUpdates).toEqual([{ failureReason: "preview failed" }]);
  });

  it("marks the attempted version failed when activation conflicts after quoting", async () => {
    const { db, state } = createSyncDbHarness({
      transactionError: new Error(
        'duplicate key value violates unique constraint "provider_rate_matrix_versions_active_provider_idx"',
      ),
    });
    const quoteReferencePrice = vi.fn(async (input: DispatchPricingInput) => ({
      providerQuotedCents: input.numberOfPage * 100,
      providerQuoteReference: null,
      quotedAt: new Date("2026-04-08T06:05:00.000Z"),
    }));

    await expect(
      syncDispatchRateMatrix({
        db,
        adapter: { quoteReferencePrice } as never,
        now: new Date("2026-04-08T06:05:00.000Z"),
      }),
    ).rejects.toThrow("provider_rate_matrix_versions_active_provider_idx");

    expect(state.retiredVersionIds).toEqual([]);
    expect(state.failedVersionUpdates).toEqual([
      {
        failureReason:
          'duplicate key value violates unique constraint "provider_rate_matrix_versions_active_provider_idx"',
      },
    ]);
  });
});
