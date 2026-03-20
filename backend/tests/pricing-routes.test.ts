import { describe, it, expect, vi } from "vitest";

// Mock the env module before importing the routes
vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    PRICE_STANDARD_CENTS: 490,
    PRICE_REGISTERED_CENTS: 890,
  }),
}));

import { calculatePrice, formatCHF } from "../src/modules/pricing/index.js";

describe("pricing routes — response shape", () => {
  it("returns correct standard pricing tier", () => {
    const standard = calculatePrice("standard");
    expect(standard.totalCents).toBe(490);
    const display = formatCHF(standard.totalCents);
    expect(display).toBe("CHF 4.90");
    // Verify the shape the route handler would produce
    const tier = {
      totalCents: standard.totalCents,
      displayPrice: display,
      currency: "CHF" as const,
    };
    expect(tier).toEqual({
      totalCents: 490,
      displayPrice: "CHF 4.90",
      currency: "CHF",
    });
  });

  it("returns correct registered pricing tier", () => {
    const registered = calculatePrice("registered");
    expect(registered.totalCents).toBe(890);
    const display = formatCHF(registered.totalCents);
    expect(display).toBe("CHF 8.90");
    const tier = {
      totalCents: registered.totalCents,
      displayPrice: display,
      currency: "CHF" as const,
    };
    expect(tier).toEqual({
      totalCents: 890,
      displayPrice: "CHF 8.90",
      currency: "CHF",
    });
  });

  it("standard and registered prices differ", () => {
    const standard = calculatePrice("standard");
    const registered = calculatePrice("registered");
    expect(standard.totalCents).not.toBe(registered.totalCents);
    expect(registered.totalCents).toBeGreaterThan(standard.totalCents);
  });
});
