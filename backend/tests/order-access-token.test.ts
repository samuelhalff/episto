import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    ORDER_ACCESS_TOKEN_SECRET: "order-access-secret-at-least-32-chars",
  }),
}));

describe("signed order access tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("issues a signed token that resolves the payment attempt id and expiry", async () => {
    const { issueOrderAccessToken, verifyOrderAccessToken } = await import(
      "../src/modules/orders/order-access-token.js"
    );

    const expiresAt = new Date("2026-07-10T12:00:00.000Z");
    const token = await issueOrderAccessToken({
      paymentAttemptId: "payment-1",
      expiresAt,
    });

    await expect(verifyOrderAccessToken(token)).resolves.toEqual({
      paymentAttemptId: "payment-1",
      expiresAt: "2026-07-10T12:00:00.000Z",
    });
  });

  it("rejects expired signed order tokens", async () => {
    const { issueOrderAccessToken, verifyOrderAccessToken } = await import(
      "../src/modules/orders/order-access-token.js"
    );

    const token = await issueOrderAccessToken({
      paymentAttemptId: "payment-expired",
      expiresAt: new Date("2026-04-11T11:59:59.000Z"),
    });

    await expect(verifyOrderAccessToken(token)).rejects.toThrow(/expired|JWT/i);
  });
});
