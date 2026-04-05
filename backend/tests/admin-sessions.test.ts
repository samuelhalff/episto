import { describe, it, expect } from "vitest";
import { parseSessionFilters } from "../src/modules/admin/admin-sessions.routes.js";

describe("admin sessions", () => {
  it("parseSessionFilters returns valid defaults", () => {
    const result = parseSessionFilters({});
    expect(result).toEqual({
      status: "all",
      page: 1,
      pageSize: 50,
      fromDate: null,
      toDate: null,
    });
  });

  it("parseSessionFilters clamps page size", () => {
    const result = parseSessionFilters({ pageSize: "500" });
    expect(result.pageSize).toBe(100);
  });

  it("parseSessionFilters parses valid filters", () => {
    const result = parseSessionFilters({
      status: "active",
      page: "3",
      pageSize: "25",
      fromDate: "2025-01-01",
      toDate: "2025-12-31",
    });
    expect(result).toEqual({
      status: "active",
      page: 3,
      pageSize: 25,
      fromDate: "2025-01-01",
      toDate: "2025-12-31",
    });
  });

  it("parseSessionFilters rejects invalid status", () => {
    const result = parseSessionFilters({ status: "bogus" });
    expect(result.status).toBe("all");
  });

  it("parseSessionFilters drops invalid fromDate", () => {
    const result = parseSessionFilters({ fromDate: "not-a-date" });
    expect(result.fromDate).toBeNull();
  });

  it("parseSessionFilters drops invalid toDate", () => {
    const result = parseSessionFilters({ toDate: "2025-13-99" });
    expect(result.toDate).toBeNull();
  });

  it("parseSessionFilters drops non-ISO date formats", () => {
    const result = parseSessionFilters({
      fromDate: "01/15/2025",
      toDate: "2025-1-1",
    });
    expect(result.fromDate).toBeNull();
    expect(result.toDate).toBeNull();
  });

  it("parseSessionFilters defaults page to 1 for non-numeric input", () => {
    const result = parseSessionFilters({ page: "abc" });
    expect(result.page).toBe(1);
  });

  it("parseSessionFilters clamps page size minimum to 1", () => {
    const result = parseSessionFilters({ pageSize: "-5" });
    expect(result.pageSize).toBe(1);
  });
});
