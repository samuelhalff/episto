import { describe, it, expect } from "vitest";
import { formatCentsAsCHF } from "../src/hooks/use-pricing";

// ---------------------------------------------------------------------------
// Extended formatCentsAsCHF tests
// ---------------------------------------------------------------------------

describe("formatCentsAsCHF — edge cases", () => {
  it("formats the standard MVP price 490 → CHF 4.90", () => {
    expect(formatCentsAsCHF(490)).toBe("CHF 4.90");
  });

  it("formats the registered MVP price 890 → CHF 8.90", () => {
    expect(formatCentsAsCHF(890)).toBe("CHF 8.90");
  });

  it("formats 100 cents → CHF 1.00", () => {
    expect(formatCentsAsCHF(100)).toBe("CHF 1.00");
  });

  it("formats 1 cent → CHF 0.01", () => {
    expect(formatCentsAsCHF(1)).toBe("CHF 0.01");
  });

  it("formats 9999 cents → CHF 99.99", () => {
    expect(formatCentsAsCHF(9999)).toBe("CHF 99.99");
  });

  it("formats 10000 cents → CHF 100.00", () => {
    expect(formatCentsAsCHF(10000)).toBe("CHF 100.00");
  });

  it("always prefixes with CHF and a space", () => {
    const result = formatCentsAsCHF(750);
    expect(result.startsWith("CHF ")).toBe(true);
  });

  it("always produces exactly 2 decimal places", () => {
    for (const cents of [1, 10, 100, 999, 1050, 5000]) {
      const result = formatCentsAsCHF(cents);
      const parts = result.replace("CHF ", "").split(".");
      expect(parts).toHaveLength(2);
      expect(parts[1]).toHaveLength(2);
    }
  });

  it("is consistent: CHF 4.90 matches backend default price constant", () => {
    // Backend default: PRICE_STANDARD_CENTS=490
    expect(formatCentsAsCHF(490)).toBe("CHF 4.90");
    // Backend default: PRICE_REGISTERED_CENTS=890
    expect(formatCentsAsCHF(890)).toBe("CHF 8.90");
  });
});
