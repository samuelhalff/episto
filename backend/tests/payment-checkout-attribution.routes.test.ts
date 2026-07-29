/**
 * Route-level attribution checks, split out of payment-checkout.routes.test.ts
 * purely because that file is at its size ceiling. The harness is the same one.
 */
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

import { paymentRoutes } from "../src/modules/payments/payment.routes.js";

describe("checkout acquisition attribution", () => {
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

  it("carries the browser's acquisition attribution onto the new payment attempt", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: {
        email: "payer@example.com",
        attribution: {
          gaClientId: "1234567890.1699999999",
          gclid: "Cj0KCQjw-test",
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "kuendigung-ch",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.createPaymentAttempt).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({
        attribution: {
          gaClientId: "1234567890.1699999999",
          gclid: "Cj0KCQjw-test",
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "kuendigung-ch",
        },
      }),
    );
  });

  it("checks out without attribution when the visitor declined analytics", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.createPaymentAttempt).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({ attribution: null }),
    );
  });

  // The two tests below are the same rule from both sides: an attribution the
  // route dislikes costs the label, never the sale. A customer must not be
  // unable to pay because a marketing team wrote a long campaign name.
  it("truncates an over-long attribution value instead of refusing the checkout", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: {
        email: "payer@example.com",
        attribution: { utmSource: "x".repeat(500) },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.createPaymentAttempt).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({
        // 128 is the CHECK constraint in migration 0031, so what we hand the
        // insert always fits the column.
        attribution: expect.objectContaining({ utmSource: "x".repeat(128) }),
      }),
    );
  });

  it("drops a structurally invalid attribution block and still takes the order", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/drafts/draft-1/checkout",
      payload: { email: "payer@example.com", attribution: "google / cpc" },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.createPaymentAttempt).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({ attribution: null }),
    );
  });
});
