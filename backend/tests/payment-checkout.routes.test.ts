import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../src/shared/errors/index.js";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
  },
  tx: {
    update: vi.fn(),
  },
  getPaymentForDraft: vi.fn(),
  transitionPaymentState: vi.fn(),
  createPaymentAttempt: vi.fn(),
  setPaymentIntentId: vi.fn(),
  createPaymentIntent: vi.fn(),
  getPaymentIntentClientSecret: vi.fn(),
  resolvePaymentDispatchQuoteForDraft: vi.fn(),
  resolveDisplayDispatchQuoteForDraft: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => mocks.db,
  schema: {
    draftLetters: {
      id: "draft_id",
      sessionId: "session_id",
      deliveryType: "delivery_type",
    },
    sessions: {
      id: "session_id",
    },
  },
}));

vi.mock("../src/modules/sessions/session.middleware.js", () => ({
  requireSession: async (request: { session?: { id: string; locale: string } }) => {
    request.session = { id: "session-1", locale: "de-CH" };
  },
}));

vi.mock("../src/modules/payments/payment.service.js", () => ({
  createPaymentAttempt: mocks.createPaymentAttempt,
  getPaymentAttemptById: vi.fn(),
  getPaymentForDraft: mocks.getPaymentForDraft,
  setPaymentIntentId: mocks.setPaymentIntentId,
  transitionPaymentState: mocks.transitionPaymentState,
}));

vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  createPaymentIntent: mocks.createPaymentIntent,
  constructWebhookEvent: vi.fn(),
  getPaymentIntentClientSecret: mocks.getPaymentIntentClientSecret,
}));

vi.mock("../src/modules/rendering/snapshot.service.js", () => ({
  getLatestSnapshot: vi.fn(),
}));

vi.mock("../src/modules/dispatch/dispatch.jobs.js", () => ({
  enqueueDispatchSubmission: vi.fn(),
}));

vi.mock("../src/modules/payments/payment-notifications.js", () => ({
  enqueuePaymentReceiptEmail: vi.fn(),
}));

vi.mock("../src/modules/dispatch/dispatch-quote.service.js", () => ({
  resolveDisplayDispatchQuoteForDraft: mocks.resolveDisplayDispatchQuoteForDraft,
  resolvePaymentDispatchQuoteForDraft: mocks.resolvePaymentDispatchQuoteForDraft,
}));

vi.mock("../src/modules/analytics/index.js", () => ({
  recordEvent: mocks.recordEvent,
}));

import { paymentRoutes } from "../src/modules/payments/payment.routes.js";

describe("payment checkout routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    mocks.db.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              id: "draft-1",
              deliveryType: "standard",
            },
          ]),
        })),
      })),
    });

    const updateChain = {
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    };

    mocks.db.update.mockReturnValue(updateChain);
    mocks.tx.update.mockReturnValue(updateChain);
    mocks.db.transaction.mockImplementation(async (callback: (tx: typeof mocks.tx) => unknown) =>
      callback(mocks.tx),
    );
    mocks.getPaymentForDraft.mockResolvedValue(null);
    mocks.resolvePaymentDispatchQuoteForDraft.mockResolvedValue({
      quote: {
        deliveryType: "standard",
        providerQuotedCents: 290,
        swissMailMarkupCents: 335,
        totalCents: 625,
        providerQuoteReference: "quote-1",
        attachmentHandling: "excluded",
        lineItems: [],
      },
    });
    mocks.createPaymentAttempt.mockResolvedValue({
      id: "payment-1",
      state: "pending",
      amountCents: 625,
    });
    mocks.createPaymentIntent.mockResolvedValue({
      paymentIntentId: "pi_1",
      clientSecret: "cs_test_1",
    });
    mocks.setPaymentIntentId.mockResolvedValue(undefined);
    mocks.transitionPaymentState.mockResolvedValue({
      payment: {
        id: "payment-old",
        state: "cancelled",
      },
      rawOrderAccessToken: null,
    });

    app = Fastify();
    app.setErrorHandler((error, request, reply) => {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send(error.toResponse(request.id));
        return;
      }

      throw error;
    });
    await app.register(paymentRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  it("updates the session email inside the checkout transaction", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.update).toHaveBeenCalledWith({ id: "session_id" });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("cancels a stale pending payment intent and creates a fresh one when Stripe can no longer find it", async () => {
    mocks.getPaymentForDraft
      .mockResolvedValueOnce({
        id: "payment-old",
        state: "pending",
        stripePaymentIntentId: "pi_stale",
        amountCents: 625,
        breakdown: {
          deliveryType: "standard",
          providerQuotedCents: 290,
          swissMailMarkupCents: 335,
          totalCents: 625,
          providerQuoteReference: "quote-old",
          attachmentHandling: "excluded",
          lineItems: [],
        },
      })
      .mockResolvedValueOnce(null);
    mocks.getPaymentIntentClientSecret.mockRejectedValueOnce(
      new AppError({
        family: "payment_failure",
        statusCode: 400,
        code: "PAYMENT_INVALID_REQUEST",
        message: "No such payment_intent: 'pi_stale'",
        userMessage: "The payment request was invalid.",
        userAction: "Please try again or use a different payment method.",
      }),
    );

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      mocks.db,
      "payment-old",
      "cancelled",
    );
    expect(mocks.createPaymentAttempt).toHaveBeenCalledTimes(1);
    expect(mocks.createPaymentIntent).toHaveBeenCalledTimes(1);
    expect(response.json()).toMatchObject({
      paymentAttemptId: "payment-1",
      clientSecret: "cs_test_1",
    });
  });
});
