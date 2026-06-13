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
  getPaymentAttemptById: vi.fn(),
  transitionPaymentState: vi.fn(),
  createPaymentAttempt: vi.fn(),
  setPaymentIntentId: vi.fn(),
  createPaymentIntent: vi.fn(),
  getPaymentIntentForCheckout: vi.fn(),
  updatePaymentIntentReceiptDetails: vi.fn(),
  assertVerifiedPhoneForCheckout: vi.fn(),
  syncDraftFulfillmentFromPaymentState: vi.fn(),
  resolvePaymentDispatchQuoteForDraft: vi.fn(),
  resolveDisplayDispatchQuoteForDraft: vi.fn(),
  getLatestSnapshot: vi.fn(),
  enqueueDispatchSubmission: vi.fn(),
  recordEvent: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => mocks.db,
  schema: {
    draftLetters: {
      id: "draft_id",
      sessionId: "session_id",
      deliveryType: "delivery_type",
      locale: "locale",
      status: "status",
      signatureFlowMode: "signature_flow_mode",
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
  getRequiredSession: (request: { session?: { id: string; locale: string } }) => {
    if (!request.session) {
      throw new Error("Expected mocked session");
    }
    return request.session;
  },
}));

vi.mock("../src/modules/payments/payment.service.js", () => ({
  createPaymentAttempt: mocks.createPaymentAttempt,
  getPaymentAttemptById: mocks.getPaymentAttemptById,
  getPaymentForDraft: mocks.getPaymentForDraft,
  setPaymentIntentId: mocks.setPaymentIntentId,
  transitionPaymentState: mocks.transitionPaymentState,
}));

vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  SWISS_CHECKOUT_PAYMENT_METHOD_TYPES: ["twint", "card"],
  createPaymentIntent: mocks.createPaymentIntent,
  constructWebhookEvent: vi.fn(),
  getPaymentIntentForCheckout: mocks.getPaymentIntentForCheckout,
  updatePaymentIntentReceiptDetails: mocks.updatePaymentIntentReceiptDetails,
}));

vi.mock("../src/modules/rendering/snapshot.service.js", () => ({
  getLatestSnapshot: mocks.getLatestSnapshot,
}));

vi.mock("../src/modules/dispatch/dispatch.jobs.js", () => ({
  enqueueDispatchSubmission: mocks.enqueueDispatchSubmission,
}));

vi.mock("../src/modules/dispatch/dispatch-quote.service.js", () => ({
  resolveDisplayDispatchQuoteForDraft: mocks.resolveDisplayDispatchQuoteForDraft,
  resolvePaymentDispatchQuoteForDraft: mocks.resolvePaymentDispatchQuoteForDraft,
}));

vi.mock("../src/modules/analytics/index.js", () => ({
  recordEvent: mocks.recordEvent,
}));

vi.mock("../src/modules/phone-verification/phone-verification.service.js", () => ({
  assertVerifiedPhoneForCheckout: mocks.assertVerifiedPhoneForCheckout,
}));

vi.mock("../src/modules/signing/fulfillment.service.js", () => ({
  syncDraftFulfillmentFromPaymentState: mocks.syncDraftFulfillmentFromPaymentState,
}));

import { paymentRoutes } from "../src/modules/payments/payment.routes.js";

describe("payment checkout routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.resetAllMocks();

    mocks.db.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              id: "draft-1",
              deliveryType: "standard",
              locale: "de-CH",
              status: "ready",
              signatureFlowMode: "visual",
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
    mocks.db.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx),
    );
    mocks.getPaymentForDraft.mockResolvedValue(null);
    mocks.getPaymentAttemptById.mockResolvedValue({
      id: "payment-1",
      state: "captured",
      draftId: "draft-1",
    });
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
    mocks.assertVerifiedPhoneForCheckout.mockResolvedValue({
      phoneE164: "+41791234567",
      phoneVerifiedAt: new Date("2026-06-04T12:00:00.000Z"),
    });
    mocks.createPaymentIntent.mockResolvedValue({
      paymentIntentId: "pi_1",
      clientSecret: "cs_test_1",
    });
    mocks.getPaymentIntentForCheckout.mockResolvedValue({
      status: "requires_payment_method",
      clientSecret: "cs_test_1",
      latestChargeId: null,
    });
    mocks.syncDraftFulfillmentFromPaymentState.mockResolvedValue(undefined);
    mocks.getLatestSnapshot.mockResolvedValue(null);
    mocks.enqueueDispatchSubmission.mockResolvedValue(undefined);
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
    expect(mocks.assertVerifiedPhoneForCheckout).toHaveBeenCalledWith(mocks.db, {
      sessionId: "session-1",
    });
    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.tx.update).toHaveBeenCalledWith({ id: "session_id" });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("rejects checkout until the session has a verified phone number", async () => {
    mocks.assertVerifiedPhoneForCheckout.mockRejectedValueOnce(
      new AppError({
        family: "policy_refusal",
        statusCode: 409,
        code: "PHONE_VERIFICATION_REQUIRED",
        message: "Checkout requires a verified phone number.",
        userMessage: "Verify your mobile number before payment.",
        userAction: "Enter your phone number and confirm the SMS code.",
      }),
    );

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: "PHONE_VERIFICATION_REQUIRED",
      },
    });
    expect(mocks.resolvePaymentDispatchQuoteForDraft).not.toHaveBeenCalled();
    expect(mocks.createPaymentAttempt).not.toHaveBeenCalled();
  });

  it("rejects checkout while the final review render is still pending", async () => {
    mocks.db.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              id: "draft-1",
              deliveryType: "standard",
              locale: "de-CH",
              status: "rendering",
              signatureFlowMode: "visual",
            },
          ]),
        })),
      })),
    });

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: "DRAFT_RENDER_PENDING",
      },
    });
    expect(mocks.resolvePaymentDispatchQuoteForDraft).not.toHaveBeenCalled();
    expect(mocks.createPaymentAttempt).not.toHaveBeenCalled();
  });

  it("reuses a resumable existing pending payment intent without creating a new attempt", async () => {
    mocks.getPaymentForDraft.mockResolvedValueOnce({
      id: "payment-existing",
      state: "pending",
      stripePaymentIntentId: "pi_existing",
      amountCents: 625,
      breakdown: {
        deliveryType: "standard",
        providerQuotedCents: 290,
        swissMailMarkupCents: 335,
        totalCents: 625,
        providerQuoteReference: "quote-existing",
        attachmentHandling: "excluded",
        lineItems: [],
      },
    });
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "requires_payment_method",
      clientSecret: "cs_existing",
      latestChargeId: null,
    });

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.getPaymentIntentForCheckout).toHaveBeenCalledWith("pi_existing");
    expect(mocks.updatePaymentIntentReceiptDetails).toHaveBeenCalledWith("pi_existing", {
      customerEmail: "payer@example.com",
      orderRef: expect.stringMatching(/^EP-/),
      draftId: "draft-1",
      sessionId: "session-1",
      paymentAttemptId: "payment-existing",
      deliveryType: "standard",
    });
    expect(mocks.transitionPaymentState).not.toHaveBeenCalled();
    expect(mocks.createPaymentAttempt).not.toHaveBeenCalled();
    expect(response.json()).toMatchObject({
      paymentAttemptId: "payment-existing",
      clientSecret: "cs_existing",
    });
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
    mocks.getPaymentIntentForCheckout.mockRejectedValueOnce(
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

  it("cancels a pending checkout and recreates it when Stripe says the existing intent is canceled", async () => {
    mocks.getPaymentForDraft
      .mockResolvedValueOnce({
        id: "payment-old",
        state: "pending",
        stripePaymentIntentId: "pi_cancelled",
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
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "canceled",
      clientSecret: "cs_dead",
      latestChargeId: null,
    });

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.getPaymentIntentForCheckout).toHaveBeenCalledWith("pi_cancelled");
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      mocks.db,
      "payment-old",
      "cancelled",
    );
    expect(mocks.createPaymentAttempt).toHaveBeenCalledTimes(1);
    expect(response.json()).toMatchObject({
      paymentAttemptId: "payment-1",
      clientSecret: "cs_test_1",
    });
  });

  it("cancels a pending checkout and recreates it when Stripe returns non-Swiss payment methods", async () => {
    mocks.getPaymentForDraft
      .mockResolvedValueOnce({
        id: "payment-old",
        state: "pending",
        stripePaymentIntentId: "pi_automatic",
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
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "requires_payment_method",
      clientSecret: "cs_automatic",
      latestChargeId: null,
      paymentMethodTypes: ["card", "klarna", "amazon_pay"],
    });

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
    expect(response.json()).toMatchObject({
      paymentAttemptId: "payment-1",
      clientSecret: "cs_test_1",
    });
  });

  it("reconciles a requires_capture pending Stripe intent as authorized and enqueues dispatch", async () => {
    mocks.getPaymentForDraft.mockResolvedValueOnce({
      id: "payment-authorized",
      state: "pending",
      stripePaymentIntentId: "pi_authorized",
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
    });
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "requires_capture",
      clientSecret: "cs_authorized",
      latestChargeId: null,
    });
    mocks.getLatestSnapshot.mockResolvedValueOnce({
      id: "snapshot-1",
      renderedPdfAssetId: "asset-1",
    });
    mocks.transitionPaymentState.mockResolvedValueOnce({
      payment: {
        id: "payment-authorized",
        state: "authorized",
      },
      rawOrderAccessToken: null,
    });

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      mocks.db,
      "payment-authorized",
      "authorized",
      {
        stripePaymentIntentId: "pi_authorized",
      },
    );
    expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledWith({
      draftId: "draft-1",
      snapshotId: "snapshot-1",
      paymentId: "payment-authorized",
    });
    expect(response.json()).toMatchObject({
      paymentAttemptId: "payment-authorized",
      clientSecret: null,
    });
  });

  it("fails checkout when dispatch enqueue fails after authorized reconciliation", async () => {
    mocks.getPaymentForDraft.mockResolvedValueOnce({
      id: "payment-authorized",
      state: "pending",
      stripePaymentIntentId: "pi_authorized",
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
    });
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "requires_capture",
      clientSecret: "cs_authorized",
      latestChargeId: null,
    });
    mocks.getLatestSnapshot.mockResolvedValueOnce({
      id: "snapshot-1",
      renderedPdfAssetId: "asset-1",
    });
    mocks.transitionPaymentState.mockResolvedValueOnce({
      payment: {
        id: "payment-authorized",
        state: "authorized",
      },
      rawOrderAccessToken: null,
    });
    mocks.enqueueDispatchSubmission.mockRejectedValueOnce(new Error("queue unavailable"));

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(500);
  });

  it("retries dispatch enqueue when checkout is reopened after authorized reconciliation failed", async () => {
    mocks.getPaymentForDraft
      .mockResolvedValueOnce({
        id: "payment-authorized",
        state: "pending",
        stripePaymentIntentId: "pi_authorized",
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
      .mockResolvedValueOnce({
        id: "payment-authorized",
        state: "authorized",
        stripePaymentIntentId: "pi_authorized",
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
      });
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "requires_capture",
      clientSecret: "cs_authorized",
      latestChargeId: null,
    });
    mocks.getLatestSnapshot
      .mockResolvedValueOnce({
        id: "snapshot-1",
        renderedPdfAssetId: "asset-1",
      })
      .mockResolvedValueOnce({
        id: "snapshot-1",
        renderedPdfAssetId: "asset-1",
      });
    mocks.transitionPaymentState.mockResolvedValueOnce({
      payment: {
        id: "payment-authorized",
        state: "authorized",
      },
      rawOrderAccessToken: null,
    });
    mocks.enqueueDispatchSubmission
      .mockRejectedValueOnce(new Error("queue unavailable"))
      .mockResolvedValueOnce(undefined);

    const firstResponse = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });
    const secondResponse = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(firstResponse.statusCode).toBe(500);
    expect(secondResponse.statusCode).toBe(200);
    expect(mocks.enqueueDispatchSubmission).toHaveBeenNthCalledWith(1, {
      draftId: "draft-1",
      snapshotId: "snapshot-1",
      paymentId: "payment-authorized",
    });
    expect(mocks.enqueueDispatchSubmission).toHaveBeenNthCalledWith(2, {
      draftId: "draft-1",
      snapshotId: "snapshot-1",
      paymentId: "payment-authorized",
    });
    expect(secondResponse.json()).toMatchObject({
      paymentAttemptId: "payment-authorized",
      clientSecret: null,
    });
  });

  it("reconciles a succeeded pending Stripe intent as captured instead of returning it to Elements", async () => {
    mocks.getPaymentForDraft.mockResolvedValueOnce({
      id: "payment-old",
      state: "pending",
      stripePaymentIntentId: "pi_succeeded",
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
    });
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "succeeded",
      clientSecret: "cs_paid",
      latestChargeId: "ch_paid",
    });
    mocks.getLatestSnapshot.mockResolvedValueOnce({
      id: "snapshot-2",
      renderedPdfAssetId: "asset-2",
    });
    mocks.transitionPaymentState.mockResolvedValueOnce({
      payment: {
        id: "payment-old",
        draftId: "draft-1",
        sessionId: "session-1",
        state: "captured",
        amountCents: 625,
      },
      rawOrderAccessToken: "order-token",
    });

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.getPaymentIntentForCheckout).toHaveBeenCalledWith("pi_succeeded");
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      mocks.db,
      "payment-old",
      "captured",
      {
        stripePaymentIntentId: "pi_succeeded",
        stripeChargeId: "ch_paid",
      },
    );
    expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledWith({
      draftId: "draft-1",
      snapshotId: "snapshot-2",
      paymentId: "payment-old",
    });
    expect(mocks.createPaymentAttempt).not.toHaveBeenCalled();
    expect(response.json()).toMatchObject({
      paymentAttemptId: "payment-old",
      clientSecret: null,
    });
  });

  it("still returns checkout success when dispatch enqueue fails after captured reconciliation", async () => {
    mocks.getPaymentForDraft.mockResolvedValueOnce({
      id: "payment-old",
      state: "pending",
      stripePaymentIntentId: "pi_succeeded",
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
    });
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "succeeded",
      clientSecret: "cs_paid",
      latestChargeId: "ch_paid",
    });
    mocks.getLatestSnapshot.mockResolvedValueOnce({
      id: "snapshot-3",
      renderedPdfAssetId: "asset-3",
    });
    mocks.transitionPaymentState.mockResolvedValueOnce({
      payment: {
        id: "payment-old",
        draftId: "draft-1",
        sessionId: "session-1",
        state: "captured",
        amountCents: 625,
      },
      rawOrderAccessToken: "order-token",
    });
    mocks.enqueueDispatchSubmission.mockRejectedValueOnce(new Error("queue unavailable"));

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledWith({
      draftId: "draft-1",
      snapshotId: "snapshot-3",
      paymentId: "payment-old",
    });
    expect(response.json()).toMatchObject({
      paymentAttemptId: "payment-old",
      clientSecret: null,
    });
  });

  it("fails after repeated stale pending checkout retries instead of looping through every raced payment", async () => {
    const staleBreakdown = {
      deliveryType: "standard",
      providerQuotedCents: 290,
      swissMailMarkupCents: 335,
      totalCents: 625,
      providerQuoteReference: "quote-stale",
      attachmentHandling: "excluded",
      lineItems: [],
    };

    mocks.getPaymentForDraft
      .mockResolvedValueOnce({
        id: "payment-stale-1",
        state: "pending",
        stripePaymentIntentId: "pi_stale_1",
        amountCents: 625,
        breakdown: staleBreakdown,
      })
      .mockResolvedValueOnce({
        id: "payment-stale-2",
        state: "pending",
        stripePaymentIntentId: "pi_stale_2",
        amountCents: 625,
        breakdown: staleBreakdown,
      })
      .mockResolvedValueOnce({
        id: "payment-stale-3",
        state: "pending",
        stripePaymentIntentId: "pi_stale_3",
        amountCents: 625,
        breakdown: staleBreakdown,
      })
      .mockResolvedValueOnce({
        id: "payment-stale-4",
        state: "pending",
        stripePaymentIntentId: "pi_stale_4",
        amountCents: 625,
        breakdown: staleBreakdown,
      });
    mocks.getPaymentIntentForCheckout
      .mockResolvedValueOnce({
        status: "canceled",
        clientSecret: null,
        latestChargeId: null,
      })
      .mockResolvedValueOnce({
        status: "canceled",
        clientSecret: null,
        latestChargeId: null,
      })
      .mockResolvedValueOnce({
        status: "canceled",
        clientSecret: null,
        latestChargeId: null,
      });

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: {
        family: "provider_outage",
        code: "CHECKOUT_RECONCILIATION_EXCEEDED",
      },
    });
    expect(mocks.transitionPaymentState).toHaveBeenCalledTimes(3);
    expect(mocks.createPaymentAttempt).not.toHaveBeenCalled();
  });

  it("reconciles a pending payment status request when Stripe already reports success", async () => {
    mocks.getPaymentForDraft.mockReset();
    mocks.getPaymentIntentForCheckout.mockReset();
    mocks.getLatestSnapshot.mockReset();
    mocks.transitionPaymentState.mockReset();
    mocks.enqueueDispatchSubmission.mockReset();

    mocks.getPaymentForDraft.mockResolvedValueOnce({
      id: "payment-status-pending",
      draftId: "draft-1",
      sessionId: "session-1",
      state: "pending",
      stripePaymentIntentId: "pi_status_succeeded",
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
      failureReason: null,
    });
    mocks.getPaymentIntentForCheckout.mockResolvedValueOnce({
      status: "succeeded",
      clientSecret: "cs_paid",
      latestChargeId: "ch_paid",
    });
    mocks.getLatestSnapshot.mockResolvedValueOnce({
      id: "snapshot-status",
      renderedPdfAssetId: "asset-status",
    });
    mocks.transitionPaymentState.mockResolvedValueOnce({
      payment: {
        id: "payment-status-pending",
        draftId: "draft-1",
        sessionId: "session-1",
        state: "captured",
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
        failureReason: null,
        updatedAt: new Date("2026-04-09T11:00:00.000Z"),
      },
      rawOrderAccessToken: "order-token",
    });

    const response = await app.inject({
      method: "GET",
      url: "/drafts/draft-1/payment",
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.getPaymentIntentForCheckout).toHaveBeenCalledWith("pi_status_succeeded");
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      mocks.db,
      "payment-status-pending",
      "captured",
      {
        stripePaymentIntentId: "pi_status_succeeded",
        stripeChargeId: "ch_paid",
      },
    );
    expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledWith({
      draftId: "draft-1",
      snapshotId: "snapshot-status",
      paymentId: "payment-status-pending",
    });
    expect(response.json()).toMatchObject({
      payment: {
        state: "captured",
        capturedAt: "2026-04-09T11:00:00.000Z",
      },
    });
  });
});
