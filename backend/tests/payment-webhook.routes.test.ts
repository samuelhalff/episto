import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/shared/errors/index.js";

const mocks = vi.hoisted(() => ({
  db: { tag: "db" },
  getPaymentForDraft: vi.fn(),
  getPaymentAttemptById: vi.fn(),
  transitionPaymentState: vi.fn(),
  constructWebhookEvent: vi.fn(),
  getLatestSnapshot: vi.fn(),
  enqueueDispatchSubmission: vi.fn(),
  enqueuePaymentReceiptEmail: vi.fn(),
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

vi.mock("../src/modules/payments/payment.service.js", () => ({
  createPaymentAttempt: vi.fn(),
  getPaymentForDraft: mocks.getPaymentForDraft,
  getPaymentAttemptById: mocks.getPaymentAttemptById,
  setPaymentIntentId: vi.fn(),
  transitionPaymentState: mocks.transitionPaymentState,
}));

vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  createPaymentIntent: vi.fn(),
  constructWebhookEvent: mocks.constructWebhookEvent,
  getPaymentIntentClientSecret: vi.fn(),
}));

vi.mock("../src/modules/rendering/snapshot.service.js", () => ({
  getLatestSnapshot: mocks.getLatestSnapshot,
}));

vi.mock("../src/modules/dispatch/dispatch.jobs.js", () => ({
  enqueueDispatchSubmission: mocks.enqueueDispatchSubmission,
}));

vi.mock("../src/modules/payments/payment-notifications.js", () => ({
  enqueuePaymentReceiptEmail: mocks.enqueuePaymentReceiptEmail,
}));

vi.mock("../src/modules/analytics/index.js", () => ({
  recordEvent: mocks.recordEvent,
}));

import { paymentRoutes } from "../src/modules/payments/payment.routes.js";

describe("payment webhook routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(paymentRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  it("resolves payment_intent.succeeded by paymentAttemptId metadata instead of the latest draft payment", async () => {
    mocks.constructWebhookEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_1",
          metadata: {
            draftId: "draft-1",
            paymentAttemptId: "payment-1",
          },
          latest_charge: "ch_1",
        },
      },
    });
    mocks.getPaymentForDraft.mockResolvedValue({
      id: "payment-latest",
      draftId: "draft-1",
      amountCents: 625,
      state: "pending",
    });
    mocks.getPaymentAttemptById.mockResolvedValue({
      id: "payment-1",
      draftId: "draft-1",
      amountCents: 625,
      state: "pending",
    });
    mocks.transitionPaymentState.mockResolvedValue({
      payment: { id: "payment-1", state: "captured" },
      rawOrderAccessToken: "order-token-1",
    });
    mocks.getLatestSnapshot.mockResolvedValue({
      id: "snapshot-1",
      renderedPdfAssetId: "pdf-1",
    });
    mocks.enqueueDispatchSubmission.mockResolvedValue(undefined);
    mocks.enqueuePaymentReceiptEmail.mockResolvedValue(undefined);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      payload: { ok: true },
      headers: {
        "content-type": "application/json",
        "stripe-signature": "signature",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mocks.getPaymentAttemptById).toHaveBeenCalledWith(mocks.db, "payment-1");
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      mocks.db,
      "payment-1",
      "captured",
      { stripeChargeId: "ch_1" },
    );
    expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledWith({
      draftId: "draft-1",
      snapshotId: "snapshot-1",
      paymentId: "payment-1",
    });
  });

  it("rejects webhook requests when the preserved raw body is not a Buffer", async () => {
    const tamperedApp = Fastify();
    tamperedApp.setErrorHandler((error, request, reply) => {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send(error.toResponse(request.id));
        return;
      }

      throw error;
    });
    tamperedApp.addHook("preHandler", (request, _reply, done) => {
      if (request.url === "/webhooks/stripe") {
        // Simulate a misconfigured parser or hook overwriting the raw payload.
        (request as FastifyInstance["request"] & { rawBodyBuffer?: unknown }).rawBodyBuffer =
          "tampered-body";
      }
      done();
    });
    await tamperedApp.register(paymentRoutes);

    const response = await tamperedApp.inject({
      method: "POST",
      url: "/webhooks/stripe",
      payload: { ok: true },
      headers: {
        "content-type": "application/json",
        "stripe-signature": "signature",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(mocks.constructWebhookEvent).not.toHaveBeenCalled();

    await tamperedApp.close();
  });

  it("waits for receipt email queueing before completing the webhook response", async () => {
    let resolveReceiptQueue: (() => void) | undefined;

    mocks.constructWebhookEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_2",
          metadata: {
            draftId: "draft-2",
            paymentAttemptId: "payment-2",
          },
          latest_charge: "ch_2",
        },
      },
    });
    mocks.getPaymentAttemptById.mockResolvedValue({
      id: "payment-2",
      draftId: "draft-2",
      amountCents: 625,
      state: "pending",
    });
    mocks.transitionPaymentState.mockResolvedValue({
      payment: { id: "payment-2", state: "captured" },
      rawOrderAccessToken: "order-token-2",
    });
    mocks.getLatestSnapshot.mockResolvedValue({
      id: "snapshot-2",
      renderedPdfAssetId: "pdf-2",
    });
    mocks.enqueueDispatchSubmission.mockResolvedValue(undefined);
    mocks.enqueuePaymentReceiptEmail.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveReceiptQueue = resolve;
      }),
    );

    let settled = false;
    const responsePromise = app.inject({
      method: "POST",
      url: "/webhooks/stripe",
      payload: { ok: true },
      headers: {
        "content-type": "application/json",
        "stripe-signature": "signature",
      },
    });
    responsePromise.then(() => {
      settled = true;
    });

    await vi.waitFor(() => {
      expect(mocks.enqueuePaymentReceiptEmail).toHaveBeenCalledOnce();
    });
    expect(settled).toBe(false);

    resolveReceiptQueue?.();

    const response = await responsePromise;
    expect(response.statusCode).toBe(200);
  });
});
