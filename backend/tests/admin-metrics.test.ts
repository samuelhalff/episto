import { describe, it, expect } from "vitest";
import { parsePeriodDays } from "../src/modules/admin/admin-metrics.routes.js";

describe("admin metrics", () => {
  it("parsePeriodDays maps period query params to day counts", () => {
    expect(parsePeriodDays("today")).toBe(1);
    expect(parsePeriodDays("7d")).toBe(7);
    expect(parsePeriodDays("30d")).toBe(30);
    expect(parsePeriodDays("garbage")).toBe(7); // default
    expect(parsePeriodDays(undefined)).toBe(7); // default
  });
});
