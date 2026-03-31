import { describe, expect, it } from "vitest";
import { normalizeAddressPresentation } from "../src/modules/ai/address-normalization.js";

describe("normalizeAddressPresentation", () => {
  it("restores readable casing for streets and cities", () => {
    expect(normalizeAddressPresentation("de-beaumont 14")).toBe("De-Beaumont 14");
    expect(normalizeAddressPresentation("lausanne")).toBe("Lausanne");
  });

  it("preserves embedded digits and punctuation", () => {
    expect(normalizeAddressPresentation("rue de l'ale 4b")).toBe("Rue De L'Ale 4b");
    expect(normalizeAddressPresentation("st. gallen")).toBe("St. Gallen");
  });
});
