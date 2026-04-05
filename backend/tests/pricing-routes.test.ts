import { describe, it, expect, vi } from "vitest";

// Mock the env module before importing the routes
vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    PRICE_STANDARD_MARKUP_CENTS: 340,
    PRICE_REGISTERED_MARKUP_CENTS: 340,
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
  }),
}));

import { getPublicPricing } from "../src/modules/pricing/index.js";

describe("pricing routes — response shape", () => {
  it("returns correct standard pricing tier", () => {
    const pricing = getPublicPricing();

    expect(pricing.standard).toEqual({
      totalCents: 495,
      displayPrice: "CHF 4.95",
      currency: "CHF",
      providerQuotedCents: 155,
      providerQuotedDisplayPrice: "CHF 1.55",
      swissMailMarkupCents: 340,
      swissMailMarkupDisplayPrice: "CHF 3.40",
    });
  });

  it("returns correct registered pricing tier", () => {
    const pricing = getPublicPricing();

    expect(pricing.registered).toEqual({
      totalCents: 918,
      displayPrice: "CHF 9.18",
      currency: "CHF",
      providerQuotedCents: 578,
      providerQuotedDisplayPrice: "CHF 5.78",
      swissMailMarkupCents: 340,
      swissMailMarkupDisplayPrice: "CHF 3.40",
    });
  });

  it("standard and registered prices differ", () => {
    const pricing = getPublicPricing();

    expect(pricing.standard.totalCents).not.toBe(pricing.registered.totalCents);
    expect(pricing.registered.totalCents).toBeGreaterThan(pricing.standard.totalCents);
    expect(pricing.registeredSurchargeCents).toBe(423);
  });
});
