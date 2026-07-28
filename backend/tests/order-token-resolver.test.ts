import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOrderAccessToken = vi.fn();
const hashResumeToken = vi.fn((token: string) => `hashed:${token}`);

class OrderAccessTokenExpiredError extends Error {}
class OrderAccessTokenVerificationError extends Error {}

vi.mock("../src/modules/orders/order-access-token.js", () => ({
  OrderAccessTokenExpiredError,
  OrderAccessTokenVerificationError,
  verifyOrderAccessToken,
}));

vi.mock("../src/modules/sessions/session.service.js", () => ({
  hashResumeToken,
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

// Use a date far in the future that won't become stale as the system clock advances.
const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

describe("resolveOrderAccessPayment", () => {
  beforeEach(() => {
    verifyOrderAccessToken.mockReset();
    hashResumeToken.mockClear();
  });

  it("prefers the signed token payload when verification succeeds", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(
        makeSelectChain([
          {
            id: "payment-1",
            orderAccessTokenExpiresAt: futureDate,
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockResolvedValue({
      paymentAttemptId: "payment-1",
      expiresAt: futureDate.toISOString(),
    });

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

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
            orderAccessTokenExpiresAt: futureDate,
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockRejectedValue(
      new OrderAccessTokenVerificationError("invalid signed order access token"),
    );

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

    const payment = await resolveOrderAccessPayment(db as never, "legacy-token");

    expect(payment?.id).toBe("payment-legacy");
    expect(hashResumeToken).toHaveBeenCalledWith("legacy-token");
  });

  it("returns null for expired signed tokens without trying the legacy hash lookup", async () => {
    const db = {
      select: vi.fn(),
    };

    verifyOrderAccessToken.mockRejectedValue(
      new OrderAccessTokenExpiredError("signed order access token expired"),
    );

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

    await expect(
      resolveOrderAccessPayment(db as never, "expired-signed-token"),
    ).resolves.toBeNull();
    expect(hashResumeToken).not.toHaveBeenCalled();
    expect(db.select).not.toHaveBeenCalled();
  });

  /**
   * The signed token is stateless — nothing about it is stored — so the only
   * thing standing between a still-valid JWT and a revoked order is this
   * column. Session erasure clears `orderAccessTokenExpiresAt` precisely so
   * that a link mailed out earlier stops opening an order belonging to someone
   * who asked to be forgotten. If this check ever moves, that guarantee goes
   * with it.
   */
  it("refuses a signed token whose order access has been revoked", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(
        makeSelectChain([
          {
            id: "payment-erased",
            orderAccessTokenExpiresAt: null,
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockResolvedValue({
      paymentAttemptId: "payment-erased",
      expiresAt: futureDate.toISOString(),
    });

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

    await expect(
      resolveOrderAccessPayment(db as never, "signed-token"),
    ).resolves.toBeNull();
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
      expiresAt: futureDate.toISOString(),
    });

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

    await expect(resolveOrderAccessPayment(db as never, "signed-token")).rejects.toThrow(
      "database offline",
    );
  });
});
