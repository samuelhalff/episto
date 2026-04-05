import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentAttemptRow } from "../src/modules/payments/payment.service.js";

const mocks = vi.hoisted(() => ({
  getPaymentAttemptById: vi.fn(),
  getPaymentForDraft: vi.fn(),
  transitionPaymentState: vi.fn(),
  capturePaymentIntent: vi.fn(),
  cancelPaymentIntent: vi.fn(),
  createRefund: vi.fn(),
}));

vi.mock("../src/modules/payments/payment.service.js", () => ({
  getPaymentAttemptById: mocks.getPaymentAttemptById,
  getPaymentForDraft: mocks.getPaymentForDraft,
  transitionPaymentState: mocks.transitionPaymentState,
}));

vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  capturePaymentIntent: mocks.capturePaymentIntent,
  cancelPaymentIntent: mocks.cancelPaymentIntent,
  createRefund: mocks.createRefund,
}));

function makePayment(overrides: Partial<PaymentAttemptRow> = {}): PaymentAttemptRow {
  return {
    id: "payment-1",
    draftId: "draft-1",
    sessionId: "session-1",
    state: "authorized",
    stripePaymentIntentId: "pi_1",
    stripeChargeId: null,
    amountCents: 625,
    currency: "CHF",
    breakdown: {},
    failureReason: null,
    refundReason: null,
    orderAccessTokenHash: null,
    orderAccessTokenExpiresAt: null,
    createdAt: new Date("2026-04-03T00:00:00Z"),
    updatedAt: new Date("2026-04-03T00:00:00Z"),
    ...overrides,
  };
}

describe("dispatch settlement", () => {
  beforeEach(() => {
    mocks.getPaymentAttemptById.mockReset();
    mocks.getPaymentForDraft.mockReset();
    mocks.transitionPaymentState.mockReset();
    mocks.capturePaymentIntent.mockReset();
    mocks.cancelPaymentIntent.mockReset();
    mocks.createRefund.mockReset();
  });

  it("returns the raw order token when the first capture happens in worker settlement", async () => {
    const db = {} as never;
    const authorizedPayment = makePayment();

    mocks.getPaymentAttemptById.mockResolvedValue(authorizedPayment);
    mocks.capturePaymentIntent.mockResolvedValue({ chargeId: "ch_1" });
    mocks.transitionPaymentState.mockResolvedValue({
      payment: makePayment({
        state: "captured",
        stripeChargeId: "ch_1",
        orderAccessTokenHash: "hashed-token",
      }),
      rawOrderAccessToken: "raw-order-token",
    });

    const { settlePaymentForDispatchResolution } =
      await import("../src/workers/dispatch-settlement.js");

    const result = await settlePaymentForDispatchResolution(
      db,
      "draft-1",
      "payment-1",
      "accepted",
    );

    expect(mocks.getPaymentAttemptById).toHaveBeenCalledWith(db, "payment-1");
    expect(mocks.capturePaymentIntent).toHaveBeenCalledWith("pi_1");
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      db,
      "payment-1",
      "captured",
      {
        stripeChargeId: "ch_1",
      },
    );
    expect(result).toEqual({
      payment: expect.objectContaining({ id: "payment-1", state: "captured" }),
      rawOrderAccessToken: "raw-order-token",
    });
  });

  it("falls back to the latest draft payment for legacy dispatch attempts without a payment id", async () => {
    const db = {} as never;
    const legacyPayment = makePayment({
      id: "payment-legacy",
      draftId: "draft-legacy",
      stripePaymentIntentId: "pi_legacy",
    });

    mocks.getPaymentForDraft.mockResolvedValue(legacyPayment);
    mocks.capturePaymentIntent.mockResolvedValue({ chargeId: "ch_legacy" });
    mocks.transitionPaymentState.mockResolvedValue({
      payment: makePayment({
        id: "payment-legacy",
        draftId: "draft-legacy",
        state: "captured",
        stripePaymentIntentId: "pi_legacy",
        stripeChargeId: "ch_legacy",
      }),
      rawOrderAccessToken: "legacy-order-token",
    });

    const { settlePaymentForDispatchResolution } =
      await import("../src/workers/dispatch-settlement.js");

    const result = await settlePaymentForDispatchResolution(
      db,
      "draft-legacy",
      null,
      "accepted",
    );

    expect(mocks.getPaymentAttemptById).not.toHaveBeenCalled();
    expect(mocks.getPaymentForDraft).toHaveBeenCalledWith(db, "draft-legacy");
    expect(result).toEqual({
      payment: expect.objectContaining({
        id: "payment-legacy",
        draftId: "draft-legacy",
        state: "captured",
      }),
      rawOrderAccessToken: "legacy-order-token",
    });
  });

  it("initiates refund when dispatch is rejected and payment is already captured", async () => {
    const db = {} as never;
    const capturedPayment = makePayment({
      state: "captured",
      stripeChargeId: "ch_1",
    });

    mocks.getPaymentAttemptById.mockResolvedValue(capturedPayment);
    mocks.createRefund.mockResolvedValue({ refundId: "re_1" });
    mocks.transitionPaymentState.mockResolvedValue({
      payment: makePayment({
        state: "refund_pending",
        refundReason: "Dispatch rejected for draft draft-1",
      }),
      rawOrderAccessToken: null,
    });

    const { settlePaymentForDispatchResolution } =
      await import("../src/workers/dispatch-settlement.js");

    const result = await settlePaymentForDispatchResolution(
      db,
      "draft-1",
      "payment-1",
      "rejected",
    );

    expect(mocks.createRefund).toHaveBeenCalledWith(
      "pi_1",
      "Dispatch rejected for draft draft-1",
    );
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      db,
      "payment-1",
      "refund_pending",
      { refundReason: "Dispatch rejected for draft draft-1" },
    );
    expect(result).toEqual({
      payment: expect.objectContaining({ state: "refund_pending" }),
      rawOrderAccessToken: null,
    });
  });

  it("returns captured payment as-is when dispatch is accepted (automatic capture)", async () => {
    const db = {} as never;
    const capturedPayment = makePayment({
      state: "captured",
      stripeChargeId: "ch_1",
    });

    mocks.getPaymentAttemptById.mockResolvedValue(capturedPayment);

    const { settlePaymentForDispatchResolution } =
      await import("../src/workers/dispatch-settlement.js");

    const result = await settlePaymentForDispatchResolution(
      db,
      "draft-1",
      "payment-1",
      "accepted",
    );

    expect(mocks.capturePaymentIntent).not.toHaveBeenCalled();
    expect(mocks.createRefund).not.toHaveBeenCalled();
    expect(result.payment?.state).toBe("captured");
  });
});
