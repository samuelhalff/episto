import { describe, it, expect } from "vitest";
import { parsePeriodInterval } from "../src/modules/admin/admin-metrics.routes.js";

describe("admin metrics", () => {
  it("parsePeriodInterval returns valid SQL intervals", () => {
    expect(parsePeriodInterval("today")).toBe("1 day");
    expect(parsePeriodInterval("7d")).toBe("7 days");
    expect(parsePeriodInterval("30d")).toBe("30 days");
    expect(parsePeriodInterval("garbage")).toBe("7 days"); // default
    expect(parsePeriodInterval(undefined)).toBe("7 days"); // default
  });
});
