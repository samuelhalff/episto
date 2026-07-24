import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  select: vi.fn(),
}));

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

describe("POST /orders/resend-link", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    vi.doMock("../src/db/index.js", () => ({
      getDb: () => ({ select: mocks.select }),
      schema: {
        paymentAttempts: {
          id: "id",
          sessionId: "session_id",
          state: "state",
          orderAccessTokenExpiresAt: "expires_at",
          createdAt: "created_at",
        },
        sessions: { id: "id", email: "email" },
      },
    }));

    vi.doMock("../src/modules/payments/receipt-notifications.js", () => ({
      enqueuePaymentReceiptEmailSafe: mocks.enqueue,
    }));

    const { orderRoutes } = await import("../src/modules/orders/order.routes.js");

    app = Fastify();
    await app.register(rateLimit, { global: false });
    await app.register(orderRoutes, { prefix: "/api/v1" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  const genericMessage = "If that email has recent orders, we've sent the links.";

  it("returns a generic 200 for an unknown email and enqueues nothing", async () => {
    mocks.select.mockReturnValue(makeSelectChain([]));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders/resend-link",
      payload: { email: "nobody@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: genericMessage });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("returns the same generic 200 for a known email and enqueues one per order", async () => {
    mocks.select.mockReturnValue(
      makeSelectChain([{ paymentAttemptId: "pay-1" }, { paymentAttemptId: "pay-2" }]),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders/resend-link",
      payload: { email: "person@example.com" },
    });

    expect(response.statusCode).toBe(200);
    // Identical body to the unknown-email case — no enumeration.
    expect(response.json()).toEqual({ message: genericMessage });
    expect(mocks.enqueue).toHaveBeenCalledTimes(2);
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.anything(), "pay-1");
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.anything(), "pay-2");
  });

  it("returns the generic 200 for a missing/empty email without querying", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/orders/resend-link",
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: genericMessage });
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
