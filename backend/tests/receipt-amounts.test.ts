import { describe, expect, it } from "vitest";
import {
  computeReceiptAmounts,
  formatReceiptNumber,
  VAT_RATE_BP,
} from "../src/modules/payments/receipt-amounts.js";

describe("computeReceiptAmounts", () => {
  it("backs VAT out of a 8.1% VAT-inclusive total (460 → net 426, vat 34)", () => {
    const result = computeReceiptAmounts(460);
    expect(result).toEqual({
      netCents: 426,
      vatCents: 34,
      totalCents: 460,
      vatRateBp: 810,
    });
  });

  it("rounds VAT half-up (915 → net 846, vat 69)", () => {
    // 915 * 0.081 / 1.081 = 68.56 → 69; net = 915 - 69 = 846
    const result = computeReceiptAmounts(915);
    expect(result.vatCents).toBe(69);
    expect(result.netCents).toBe(846);
    expect(result.totalCents).toBe(915);
  });

  it("returns zeroes for a free (0-cent) order", () => {
    expect(computeReceiptAmounts(0)).toEqual({
      netCents: 0,
      vatCents: 0,
      totalCents: 0,
      vatRateBp: 810,
    });
  });

  it("always reports the 8.1% rate in basis points", () => {
    expect(computeReceiptAmounts(1000).vatRateBp).toBe(VAT_RATE_BP);
    expect(VAT_RATE_BP).toBe(810);
  });

  it("preserves net + vat = total invariant", () => {
    for (const total of [1, 99, 290, 460, 580, 915, 1234, 9999]) {
      const { netCents, vatCents } = computeReceiptAmounts(total);
      expect(netCents + vatCents).toBe(total);
    }
  });
});

describe("formatReceiptNumber", () => {
  it("zero-pads to six digits with the EP-R- prefix", () => {
    expect(formatReceiptNumber(42)).toBe("EP-R-000042");
    expect(formatReceiptNumber(1)).toBe("EP-R-000001");
  });

  it("does not truncate numbers exceeding six digits", () => {
    expect(formatReceiptNumber(1234567)).toBe("EP-R-1234567");
  });
});
