import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculatePrice, formatCHF } from "../src/modules/pricing/index.js";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    PRICE_STANDARD_CENTS: 490,
    PRICE_REGISTERED_CENTS: 890,
  }),
}));

describe("calculatePrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns CHF 4.90 (490 cents) for standard delivery", () => {
    const result = calculatePrice("standard");
    expect(result.totalCents).toBe(490);
    expect(result.baseCents).toBe(490);
  });

  it("returns CHF 8.90 (890 cents) for registered delivery", () => {
    const result = calculatePrice("registered");
    expect(result.totalCents).toBe(890);
    expect(result.baseCents).toBe(890);
  });

  it("has zero surcharges in MVP", () => {
    const result = calculatePrice("standard");
    expect(result.deliverySurchargeCents).toBe(0);
    expect(result.pageSurchargeCents).toBe(0);
    expect(result.attachmentSurchargeCents).toBe(0);
  });

  it("total equals base + all surcharges", () => {
    const result = calculatePrice("registered");
    const sum =
      result.baseCents +
      result.deliverySurchargeCents +
      result.pageSurchargeCents +
      result.attachmentSurchargeCents;
    expect(result.totalCents).toBe(sum);
  });
});

describe("formatCHF", () => {
  it("formats 490 cents as CHF 4.90", () => {
    expect(formatCHF(490)).toBe("CHF 4.90");
  });

  it("formats 890 cents as CHF 8.90", () => {
    expect(formatCHF(890)).toBe("CHF 8.90");
  });

  it("formats 0 cents as CHF 0.00", () => {
    expect(formatCHF(0)).toBe("CHF 0.00");
  });

  it("formats 1000 cents as CHF 10.00", () => {
    expect(formatCHF(1000)).toBe("CHF 10.00");
  });

  it("formats 5 cents as CHF 0.05", () => {
    expect(formatCHF(5)).toBe("CHF 0.05");
  });
});
