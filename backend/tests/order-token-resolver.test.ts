import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOrderAccessToken = vi.fn();

vi.mock("../src/modules/orders/order-access-token.js", () => ({
  verifyOrderAccessToken,
}));

vi.mock("../src/modules/sessions/session.service.js", () => ({
  hashResumeToken: (token: string) => `hashed:${token}`,
}));

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(rows),
      })),
    })),
  };
}

describe("resolveOrderAccessPayment", () => {
  beforeEach(() => {
    verifyOrderAccessToken.mockReset();
  });

  it("prefers the signed token payload when verification succeeds", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(
        makeSelectChain([
          {
            id: "payment-1",
            orderAccessTokenExpiresAt: new Date("2026-07-10T12:00:00.000Z"),
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockResolvedValue({
      paymentAttemptId: "payment-1",
      expiresAt: "2026-07-10T12:00:00.000Z",
    });

    const { resolveOrderAccessPayment } = await import(
      "../src/modules/orders/order-token-resolver.js"
    );

    const payment = await resolveOrderAccessPayment(db as never, "signed-token");

    expect(payment?.id).toBe("payment-1");
  });

  it("falls back to the legacy hash lookup when signed verification fails", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(
        makeSelectChain([
          {
            id: "payment-legacy",
            orderAccessTokenHash: "hashed:legacy-token",
            orderAccessTokenExpiresAt: new Date("2026-07-10T12:00:00.000Z"),
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockRejectedValue(new Error("JWT verification failed"));

    const { resolveOrderAccessPayment } = await import(
      "../src/modules/orders/order-token-resolver.js"
    );

    const payment = await resolveOrderAccessPayment(db as never, "legacy-token");

    expect(payment?.id).toBe("payment-legacy");
  });

  it("surfaces signed-token lookup failures instead of swallowing them", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockRejectedValue(new Error("database offline")),
          })),
        })),
      }),
    };

    verifyOrderAccessToken.mockResolvedValue({
      paymentAttemptId: "payment-1",
      expiresAt: "2026-07-10T12:00:00.000Z",
    });

    const { resolveOrderAccessPayment } = await import(
      "../src/modules/orders/order-token-resolver.js"
    );

    await expect(
      resolveOrderAccessPayment(db as never, "signed-token"),
    ).rejects.toThrow("database offline");
  });
});
