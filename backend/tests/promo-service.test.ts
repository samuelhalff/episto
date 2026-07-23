import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  schema: {
    promoCodes: {
      code: "code",
      id: "id",
      active: "active",
      maxRedemptions: "max",
      redeemedCount: "rc",
      updatedAt: "ua",
    },
  },
}));

vi.mock("../src/db/index.js", () => ({ schema: mocks.schema }));
vi.mock("../src/shared/errors/index.js", () => ({
  validationError: (message: string) =>
    Object.assign(new Error(message), { isValidation: true }),
}));

import {
  applyPromoToTotal,
  normalizePromoCode,
  recordPromoRedemption,
} from "../src/modules/payments/promo.service.js";

function selectDb(row: unknown) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: async () => (row ? [row] : []),
  };
  return { select: () => chain } as never;
}

function updateDb(returnedRows: unknown[]) {
  const chain = {
    set: () => chain,
    where: () => chain,
    returning: async () => returnedRows,
  };
  return { update: () => chain } as never;
}

const base = {
  id: "p1",
  code: "LAUNCH",
  active: true,
  expiresAt: null,
  maxRedemptions: null,
  redeemedCount: 0,
};

describe("promo.service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalises codes (trim + uppercase)", () => {
    expect(normalizePromoCode("  launch10 ")).toBe("LAUNCH10");
  });

  it("free code makes the total zero", async () => {
    const r = await applyPromoToTotal(selectDb({ ...base, kind: "free", value: 0 }), {
      code: "launch",
      baseTotalCents: 455,
    });
    expect(r).toMatchObject({ discountCents: 455, finalCents: 0, kind: "free" });
  });

  it("percent code reduces proportionally and never below zero", async () => {
    const r = await applyPromoToTotal(selectDb({ ...base, kind: "percent", value: 50 }), {
      code: "LAUNCH",
      baseTotalCents: 455,
    });
    expect(r.discountCents).toBe(228); // round(455*0.5)
    expect(r.finalCents).toBe(227);
  });

  it("fixed code caps the discount at the total", async () => {
    const r = await applyPromoToTotal(selectDb({ ...base, kind: "fixed", value: 1000 }), {
      code: "LAUNCH",
      baseTotalCents: 455,
    });
    expect(r.discountCents).toBe(455);
    expect(r.finalCents).toBe(0);
  });

  it("rejects an unknown code", async () => {
    await expect(
      applyPromoToTotal(selectDb(null), { code: "NOPE", baseTotalCents: 455 }),
    ).rejects.toThrow();
  });

  it("rejects an inactive code", async () => {
    await expect(
      applyPromoToTotal(selectDb({ ...base, kind: "free", active: false }), {
        code: "LAUNCH",
        baseTotalCents: 455,
      }),
    ).rejects.toThrow();
  });

  it("rejects an expired code", async () => {
    await expect(
      applyPromoToTotal(
        selectDb({ ...base, kind: "free", expiresAt: new Date(Date.now() - 1000) }),
        { code: "LAUNCH", baseTotalCents: 455 },
      ),
    ).rejects.toThrow();
  });

  it("rejects a fully-redeemed code", async () => {
    await expect(
      applyPromoToTotal(
        selectDb({ ...base, kind: "free", maxRedemptions: 100, redeemedCount: 100 }),
        { code: "LAUNCH", baseTotalCents: 455 },
      ),
    ).rejects.toThrow();
  });

  it("recordPromoRedemption returns true when consumed, false when the cap is hit", async () => {
    expect(await recordPromoRedemption(updateDb([{ id: "p1" }]), "p1")).toBe(true);
    expect(await recordPromoRedemption(updateDb([]), "p1")).toBe(false);
  });
});
