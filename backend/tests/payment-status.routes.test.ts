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
    select: vi.fn(),
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
  buildDraftFulfillmentResponse: vi.fn(),
  resolvePaymentDispatchQuoteForDraft: vi.fn(),
  resolveDisplayDispatchQuoteForDraft: vi.fn(),
  getLatestSnapshot: vi.fn(),
  enqueueDispatchSubmission: vi.fn(),
  recordEvent: vi.fn(),
  applyPromoToTotal: vi.fn(),
  recordPromoRedemption: vi.fn(),
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
  ALLOWED_PAYMENT_METHOD_TYPES: new Set(["card", "twint", "link"]),
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

vi.mock("../src/modules/signing/fulfillment-response.service.js", () => ({
  buildDraftFulfillmentResponse: mocks.buildDraftFulfillmentResponse,
}));

vi.mock("../src/modules/payments/promo.service.js", () => ({
  applyPromoToTotal: mocks.applyPromoToTotal,
  recordPromoRedemption: mocks.recordPromoRedemption,
}));

import { paymentRoutes } from "../src/modules/payments/payment.routes.js";

describe("payment status and promo-quote routes", () => {
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
    // tx.select(...).from(...).where(...).for("update") — the per-draft lock.
    mocks.tx.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          for: vi.fn().mockResolvedValue([{ id: "draft-1" }]),
        })),
      })),
    });
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
    mocks.resolveDisplayDispatchQuoteForDraft.mockResolvedValue({
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
    mocks.buildDraftFulfillmentResponse.mockResolvedValue({
      fulfillment: {
        draftId: "draft-1",
        signatureFlowMode: "visual",
        fulfillmentStatus: "payment_captured",
        payment: null,
        dispatch: null,
        nextAction: "await_dispatch",
      },
    });
    mocks.getLatestSnapshot.mockResolvedValue(null);
    mocks.enqueueDispatchSubmission.mockResolvedValue(undefined);
    mocks.setPaymentIntentId.mockResolvedValue(undefined);
    mocks.applyPromoToTotal.mockResolvedValue({
      promoCodeId: "promo-1",
      code: "SAVE20",
      kind: "percent",
      discountCents: 125,
      finalCents: 500,
    });
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

  it("returns an immediate discounted quote without reserving a redemption", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/promo-quote",
      payload: { promoCode: "save20" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.applyPromoToTotal).toHaveBeenCalledWith(mocks.db, {
      code: "save20",
      baseTotalCents: 625,
    });
    expect(response.json()).toMatchObject({
      quote: { totalCents: 500 },
      promo: { code: "SAVE20", discountCents: 125 },
    });
    expect(mocks.recordPromoRedemption).not.toHaveBeenCalled();
  });

  it("returns the canonical validation error for an unusable promo code", async () => {
    mocks.applyPromoToTotal.mockRejectedValueOnce(
      new AppError({
        family: "validation_error",
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "This promo code is not valid.",
        userMessage: "This promo code is not valid.",
      }),
    );

    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/promo-quote",
      payload: { promoCode: "NOPE" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", userMessage: "This promo code is not valid." },
    });
    expect(mocks.recordPromoRedemption).not.toHaveBeenCalled();
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

  // Regression guard: the confirmation page polls GET /drafts/:id/fulfillment.
  // This route was silently dropped once (with the QES signing routes file),
  // which hung the confirmation page on "Payment verification". Keep it wired.
  it("serves the draft fulfillment view the confirmation page polls", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/drafts/draft-1/fulfillment",
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.buildDraftFulfillmentResponse).toHaveBeenCalledWith(
      mocks.db,
      "draft-1",
      "session-1",
    );
    // The frontend hook reads `response.fulfillment`, so the envelope matters.
    expect(response.json()).toMatchObject({
      fulfillment: { draftId: "draft-1", nextAction: "await_dispatch" },
    });
  });
});
