import { describe, it, expect } from "vitest";
import {
  getExampleForPageCount,
  getPageBounds,
  getPerPageIncrementDisplayPrice,
} from "../src/components/marketing/pricing-calculations";
import type { PricingExample } from "../src/components/marketing/pricing-types";

describe("pricing calculations", () => {
  it("returns the exact stored example for a given page count", () => {
    const examples: PricingExample[] = [
      { pageCount: 1, totalCents: 490, displayPrice: "CHF 4.90" },
      { pageCount: 2, totalCents: 890, displayPrice: "CHF 8.90" },
    ];

    expect(getExampleForPageCount(examples, 2)).toBe(examples[1]);
    expect(getExampleForPageCount(examples, 3)).toBeUndefined();
  });

  it("returns page bounds based on first and last example page counts", () => {
    const examples: PricingExample[] = [
      { pageCount: 2, totalCents: 800, displayPrice: "CHF 8.00" },
      { pageCount: 4, totalCents: 1600, displayPrice: "CHF 16.00" },
    ];

    expect(getPageBounds(examples)).toEqual({ min: 2, max: 4 });
  });

  it("returns min/max regardless of input order", () => {
    const examples: PricingExample[] = [
      { pageCount: 5, totalCents: 2500, displayPrice: "CHF 25.00" },
      { pageCount: 1, totalCents: 500, displayPrice: "CHF 5.00" },
      { pageCount: 3, totalCents: 1500, displayPrice: "CHF 15.00" },
    ];

    expect(getPageBounds(examples)).toEqual({ min: 1, max: 5 });
  });

  it("returns a per-page +CHF display price when increments are even and consecutive", () => {
    const examples: PricingExample[] = [
      { pageCount: 1, totalCents: 490, displayPrice: "CHF 4.90" },
      { pageCount: 2, totalCents: 890, displayPrice: "CHF 8.90" },
      { pageCount: 3, totalCents: 1290, displayPrice: "CHF 12.90" },
    ];

    expect(getPerPageIncrementDisplayPrice(examples)).toBe("+CHF 4.00");
  });

  it("returns undefined when increments are not even across adjacent examples", () => {
    const examples: PricingExample[] = [
      { pageCount: 1, totalCents: 400, displayPrice: "CHF 4.00" },
      { pageCount: 2, totalCents: 800, displayPrice: "CHF 8.00" },
      { pageCount: 3, totalCents: 1400, displayPrice: "CHF 14.00" },
    ];

    expect(getPerPageIncrementDisplayPrice(examples)).toBeUndefined();
  });

  it("returns undefined when page counts are not consecutive", () => {
    const examples: PricingExample[] = [
      { pageCount: 1, totalCents: 490, displayPrice: "CHF 4.90" },
      { pageCount: 3, totalCents: 1290, displayPrice: "CHF 12.90" },
    ];

    expect(getPerPageIncrementDisplayPrice(examples)).toBeUndefined();
  });
});
