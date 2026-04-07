import { describe, expect, it, vi } from "vitest";

import {
  getActiveMatrixQuote,
  refreshDispatchRateMatrixIfNeeded,
} from "../src/modules/dispatch/dispatch-rate-matrix.service.js";
import type { DispatchPricingInput } from "../src/modules/dispatch/dispatch-pricing-input.service.js";

describe("refreshDispatchRateMatrixIfNeeded", () => {
  it("retires active matrix versions whose expiry has passed", async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            { id: "matrix-1" },
            { id: "matrix-2" },
          ]),
        })),
      })),
      update: vi.fn(() => ({
        set: updateSet,
      })),
    };
    const now = new Date("2026-04-07T12:00:00.000Z");

    await refreshDispatchRateMatrixIfNeeded(db as never, now);

    expect(db.update).toHaveBeenCalledTimes(2);
    expect(updateSet).toHaveBeenCalledWith({
      status: "retired",
      updatedAt: now,
    });
    expect(updateWhere).toHaveBeenCalledTimes(2);
  });

  it("does nothing when no active matrix version is expired", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
      update: vi.fn(),
    };

    await refreshDispatchRateMatrixIfNeeded(db as never, new Date("2026-04-07T12:00:00.000Z"));

    expect(db.update).not.toHaveBeenCalled();
  });
});

const baseInput: DispatchPricingInput = {
  postage: "REGISTERED",
  numberOfPage: 2,
  attachmentMode: "none",
  shippingCountry: "CH",
  envelopeSize: "C5",
  windowLocation: "LEFT",
  duplex: false,
};

describe("getActiveMatrixQuote freshness", () => {
  function makeDb(rows: unknown[]) {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.innerJoin = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn().mockResolvedValue(rows);
    return {
      select: vi.fn(() => chain),
    };
  }

  it("returns a row when the mock returns one (baseline)", async () => {
    const mockRow = {
      versionId: "v1",
      providerQuotedCents: 578,
      quotedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
    };
    const db = makeDb([mockRow]);
    const result = await getActiveMatrixQuote(db as never, baseInput, new Date());
    expect(result).toEqual(mockRow);
  });

  it("returns null when no rows match (expired or missing expiresAt filtered at DB level)", async () => {
    const db = makeDb([]);
    const result = await getActiveMatrixQuote(db as never, baseInput, new Date());
    expect(result).toBeNull();
  });
});
