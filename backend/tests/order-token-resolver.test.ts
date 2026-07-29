import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as OrderAccessTokenModule from "../src/modules/orders/order-access-token.js";

const verifyOrderAccessToken = vi.fn();
const hashResumeToken = vi.fn((token: string) => `hashed:${token}`);

class OrderAccessTokenExpiredError extends Error {}
class OrderAccessTokenVerificationError extends Error {}

// Only the verification is faked. `orderAccessGeneration` is the real one on
// purpose: it is half of the comparison under test here, and a stubbed copy
// would keep agreeing with itself even if the real derivation changed shape.
vi.mock("../src/modules/orders/order-access-token.js", async () => ({
  OrderAccessTokenExpiredError,
  OrderAccessTokenVerificationError,
  verifyOrderAccessToken,
  orderAccessGeneration: (
    await vi.importActual<typeof OrderAccessTokenModule>(
      "../src/modules/orders/order-access-token.js",
    )
  ).orderAccessGeneration,
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

// Two successive access-token hashes for the same order: the first is what the
// customer's original link was issued against, the second is what rotating
// replaces it with.
const GENERATION_ONE_HASH = "aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbb";
const GENERATION_TWO_HASH = "ccccccccccccccccdddddddddddddddd";
const { orderAccessGeneration } =
  await import("../src/modules/orders/order-access-token.js");

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
            orderAccessTokenHash: GENERATION_ONE_HASH,
            orderAccessTokenExpiresAt: futureDate,
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockResolvedValue({
      paymentAttemptId: "payment-1",
      expiresAt: futureDate.toISOString(),
      generation: orderAccessGeneration(GENERATION_ONE_HASH),
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
            orderAccessTokenHash: GENERATION_ONE_HASH,
            orderAccessTokenExpiresAt: null,
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockResolvedValue({
      paymentAttemptId: "payment-erased",
      expiresAt: futureDate.toISOString(),
      generation: orderAccessGeneration(GENERATION_ONE_HASH),
    });

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

    await expect(
      resolveOrderAccessPayment(db as never, "signed-token"),
    ).resolves.toBeNull();
  });

  /**
   * The whole point of the generation claim. Before it existed a signed link
   * could not be withdrawn at all: it named a payment and an expiry and nothing
   * the server could change. A customer who forwarded their link to the wrong
   * address, or whose mailbox later changed hands, had no way to take it back
   * short of waiting out the retention window. Rotating the access-token hash
   * has to make the old link stop opening the order, and this is the assertion
   * that says so.
   */
  it("refuses a signed token issued against a superseded generation", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(
        makeSelectChain([
          {
            id: "payment-rotated",
            orderAccessTokenHash: GENERATION_TWO_HASH,
            orderAccessTokenExpiresAt: futureDate,
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockResolvedValue({
      paymentAttemptId: "payment-rotated",
      expiresAt: futureDate.toISOString(),
      generation: orderAccessGeneration(GENERATION_ONE_HASH),
    });

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

    await expect(
      resolveOrderAccessPayment(db as never, "stale-signed-token"),
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
      generation: orderAccessGeneration(GENERATION_ONE_HASH),
    });

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

    await expect(resolveOrderAccessPayment(db as never, "signed-token")).rejects.toThrow(
      "database offline",
    );
  });
});
