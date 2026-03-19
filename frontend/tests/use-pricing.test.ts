import { describe, it, expect } from "vitest";
import { formatCentsAsCHF } from "../src/hooks/use-pricing.js";

describe("formatCentsAsCHF", () => {
  it("formats 490 cents as CHF 4.90", () => {
    expect(formatCentsAsCHF(490)).toBe("CHF 4.90");
  });

  it("formats 890 cents as CHF 8.90", () => {
    expect(formatCentsAsCHF(890)).toBe("CHF 8.90");
  });

  it("formats 0 cents as CHF 0.00", () => {
    expect(formatCentsAsCHF(0)).toBe("CHF 0.00");
  });

  it("formats 1000 cents as CHF 10.00", () => {
    expect(formatCentsAsCHF(1000)).toBe("CHF 10.00");
  });

  it("formats 5 cents as CHF 0.05", () => {
    expect(formatCentsAsCHF(5)).toBe("CHF 0.05");
  });

  it("matches backend formatCHF output for MVP prices", () => {
    expect(formatCentsAsCHF(490)).toBe("CHF 4.90");
    expect(formatCentsAsCHF(890)).toBe("CHF 8.90");
  });
});
