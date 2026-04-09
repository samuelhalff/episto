import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    ORDER_ACCESS_DAYS: 90,
    STATEMENT_RETENTION_DAYS: 10,
  }),
}));

describe("order access statement window", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T12:00:00.000Z"));
  });

  it("derives the original order issue timestamp from the order token expiry", async () => {
    const { getOrderIssuedAt } = await import(
      "../src/modules/orders/order-access-window.js"
    );

    const issuedAt = getOrderIssuedAt(
      new Date("2026-07-08T12:00:00.000Z"),
    );

    expect(issuedAt?.toISOString()).toBe("2026-04-09T12:00:00.000Z");
  });

  it("allows statement downloads during the retention window", async () => {
    const { isStatementWithinRetentionWindow } = await import(
      "../src/modules/orders/order-access-window.js"
    );

    expect(
      isStatementWithinRetentionWindow(
        new Date("2026-07-08T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("expires statement downloads after the retention window closes", async () => {
    const { isStatementWithinRetentionWindow } = await import(
      "../src/modules/orders/order-access-window.js"
    );

    expect(
      isStatementWithinRetentionWindow(
        new Date("2026-06-28T11:59:59.000Z"),
      ),
    ).toBe(false);
  });
});
