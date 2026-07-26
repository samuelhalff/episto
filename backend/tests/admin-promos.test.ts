import { describe, expect, it } from "vitest";
import { createAdminPromoSchema, updateAdminPromoSchema } from "@episto/shared";
import { derivePromoStatus } from "../src/modules/admin/admin-promos.service.js";

const NOW = new Date("2026-07-26T12:00:00.000Z");

describe("derivePromoStatus", () => {
  const base = { expiresAt: null, maxRedemptions: null, redeemedCount: 0, active: true };

  it("is active when enabled, unexpired, and not exhausted", () => {
    expect(derivePromoStatus(base, NOW)).toBe("active");
  });

  it("is expired once past expiresAt (regardless of active)", () => {
    const past = new Date(NOW.getTime() - 1000);
    expect(derivePromoStatus({ ...base, expiresAt: past }, NOW)).toBe("expired");
    expect(derivePromoStatus({ ...base, expiresAt: past, active: false }, NOW)).toBe(
      "expired",
    );
  });

  it("is expired once fully redeemed (redeemedCount >= maxRedemptions)", () => {
    expect(derivePromoStatus({ ...base, maxRedemptions: 1, redeemedCount: 1 }, NOW)).toBe(
      "expired",
    );
  });

  it("is active while a capped code still has redemptions left", () => {
    expect(
      derivePromoStatus({ ...base, maxRedemptions: 100, redeemedCount: 3 }, NOW),
    ).toBe("active");
  });

  it("is inactive when disabled but not expired/exhausted", () => {
    expect(derivePromoStatus({ ...base, active: false }, NOW)).toBe("inactive");
  });
});

describe("createAdminPromoSchema", () => {
  const valid = {
    code: "save20",
    kind: "percent" as const,
    value: 20,
    maxRedemptions: null,
    expiresAt: null,
    active: true,
    note: null,
  };

  it("normalises the code to trimmed uppercase", () => {
    const parsed = createAdminPromoSchema.parse({ ...valid, code: "  save20 " });
    expect(parsed.code).toBe("SAVE20");
  });

  it("rejects a free code with a non-zero value", () => {
    expect(() =>
      createAdminPromoSchema.parse({ ...valid, kind: "free", value: 5 }),
    ).toThrow();
  });

  it("rejects a percent above 100", () => {
    expect(() => createAdminPromoSchema.parse({ ...valid, value: 150 })).toThrow();
  });

  it("accepts a one-time cap of 1 but rejects 0", () => {
    expect(
      createAdminPromoSchema.parse({ ...valid, maxRedemptions: 1 }).maxRedemptions,
    ).toBe(1);
    expect(() => createAdminPromoSchema.parse({ ...valid, maxRedemptions: 0 })).toThrow();
  });

  it("accepts an ISO datetime with offset for expiry", () => {
    const parsed = createAdminPromoSchema.parse({
      ...valid,
      expiresAt: "2026-12-31T22:59:00.000Z",
    });
    expect(parsed.expiresAt).toBe("2026-12-31T22:59:00.000Z");
  });

  it("coerces a blank note to null", () => {
    expect(createAdminPromoSchema.parse({ ...valid, note: "   " }).note).toBeNull();
  });
});

describe("updateAdminPromoSchema", () => {
  it("has no active field (activation is the dedicated toggle)", () => {
    const parsed = updateAdminPromoSchema.parse({
      code: "X",
      kind: "fixed",
      value: 200,
      maxRedemptions: null,
      expiresAt: null,
      note: null,
    });
    expect("active" in parsed).toBe(false);
  });
});
