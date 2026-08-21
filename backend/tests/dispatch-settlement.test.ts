import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentAttemptRow } from "../src/modules/payments/payment.service.js";
import { canFinalizeDispatchResolution } from "../src/workers/dispatch-settlement.js";

const mocks = vi.hoisted(() => ({
  getPaymentAttemptById: vi.fn(),
  getPaymentForDraft: vi.fn(),
  transitionPaymentState: vi.fn(),
  capturePaymentIntent: vi.fn(),
  cancelPaymentIntent: vi.fn(),
  createRefund: vi.fn(),
  listRefundsForCharge: vi.fn(),
  syncRefundsForCharge: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => mocks.logger,
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
  listRefundsForCharge: mocks.listRefundsForCharge,
}));

vi.mock("../src/modules/payments/refund-ledger.service.js", () => ({
  syncRefundsForCharge: mocks.syncRefundsForCharge,
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
    verifiedPhoneE164: null,
    phoneVerifiedAt: null,
    orderAccessTokenHash: null,
    orderAccessTokenExpiresAt: null,
    gaClientId: null,
    attributionGclid: null,
    attributionUtmSource: null,
    attributionUtmMedium: null,
    attributionUtmCampaign: null,
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
    mocks.listRefundsForCharge.mockReset().mockResolvedValue([]);
    mocks.syncRefundsForCharge.mockReset();
    mocks.logger.error.mockReset();
    mocks.logger.warn.mockReset();
    mocks.logger.info.mockReset();
  });

  it("does not finalize a rejected dispatch while payment remains captured", () => {
    expect(
      canFinalizeDispatchResolution("rejected", makePayment({ state: "captured" })),
    ).toBe(false);
  });

  it("can finalize a rejected dispatch after a partial refund projection", () => {
    expect(
      canFinalizeDispatchResolution(
        "rejected",
        makePayment({ state: "partially_refunded" }),
      ),
    ).toBe(true);
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

    mocks.getPaymentAttemptById
      .mockResolvedValueOnce(capturedPayment)
      .mockResolvedValueOnce(makePayment({ state: "refund_pending" }));
    mocks.createRefund.mockResolvedValue({
      refundId: "re_1",
      chargeId: "ch_1",
      amountCents: 455,
      currency: "CHF",
      status: "pending",
      stripeCreatedAt: new Date(),
      balanceTransactionId: null,
      feeCents: null,
      failureReason: null,
    });
    mocks.syncRefundsForCharge.mockResolvedValue("refund_pending");

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
      expect.objectContaining({
        reason: "Dispatch rejected for draft draft-1",
        idempotencyKey: "full-refund:payment-1",
      }),
    );
    expect(mocks.syncRefundsForCharge).toHaveBeenCalledWith(db, "ch_1");
    expect(result).toEqual({
      payment: expect.objectContaining({ state: "refund_pending" }),
      rawOrderAccessToken: null,
    });
  });

  /**
   * The expensive failure: Stripe refunded, our ledger projection did not, and
   * the payment row still reads `captured`. A settlement retry — or a support
   * agent — must not put a second refund through.
   */
  it("never refunds a charge Stripe has already refunded", async () => {
    const db = {} as never;
    mocks.getPaymentAttemptById.mockResolvedValue(
      makePayment({ state: "captured", stripeChargeId: "ch_1" }),
    );
    mocks.listRefundsForCharge.mockResolvedValue([
      { refundId: "re_existing", chargeId: "ch_1", amountCents: 455 },
    ]);
    mocks.syncRefundsForCharge.mockResolvedValue("refunded");

    const { settlePaymentForDispatchResolution } =
      await import("../src/workers/dispatch-settlement.js");

    await settlePaymentForDispatchResolution(db, "draft-1", "payment-1", "rejected");

    expect(mocks.createRefund).not.toHaveBeenCalled();
    expect(mocks.syncRefundsForCharge).toHaveBeenCalledWith(db, "ch_1");
  });

  it("does not finalize while the refund ledger cannot be synchronized", async () => {
    const db = {} as never;
    const capturedPayment = makePayment({
      state: "captured",
      stripeChargeId: "ch_1",
    });
    mocks.getPaymentAttemptById
      .mockResolvedValueOnce(capturedPayment)
      .mockResolvedValueOnce(capturedPayment);
    mocks.createRefund.mockResolvedValue({
      refundId: "re_1",
      chargeId: "ch_1",
      amountCents: 455,
      currency: "CHF",
      status: "pending",
      stripeCreatedAt: new Date(),
      balanceTransactionId: null,
      feeCents: null,
      failureReason: null,
    });
    mocks.syncRefundsForCharge.mockRejectedValue(new Error("Stripe ledger unavailable"));

    const { settlePaymentForDispatchResolution } =
      await import("../src/workers/dispatch-settlement.js");
    await expect(
      settlePaymentForDispatchResolution(db, "draft-1", "payment-1", "rejected"),
    ).rejects.toThrow("Stripe ledger unavailable");
    expect(mocks.getPaymentAttemptById).toHaveBeenCalledTimes(1);
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

  it("finalizes an accepted free order without Stripe calls", async () => {
    const db = {} as never;
    const freePayment = makePayment({
      state: "captured",
      amountCents: 0,
      stripePaymentIntentId: null,
      stripeChargeId: null,
    });
    mocks.getPaymentAttemptById.mockResolvedValue(freePayment);

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
    expect(result).toEqual({ payment: freePayment, rawOrderAccessToken: null });
  });

  it("voids a rejected free order locally without refunding through Stripe", async () => {
    const db = {} as never;
    const freePayment = makePayment({
      state: "captured",
      amountCents: 0,
      stripePaymentIntentId: null,
      stripeChargeId: null,
    });
    const refundedPayment = makePayment({
      ...freePayment,
      state: "refunded",
      refundReason: "Free order (no charge): dispatch rejected, nothing to refund",
    });
    mocks.getPaymentAttemptById.mockResolvedValue(freePayment);
    mocks.transitionPaymentState.mockResolvedValue({
      payment: refundedPayment,
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

    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      db,
      "payment-1",
      "refunded",
      expect.objectContaining({
        refundReason: "Free order (no charge): dispatch rejected, nothing to refund",
      }),
    );
    expect(mocks.createRefund).not.toHaveBeenCalled();
    expect(result).toEqual({ payment: refundedPayment, rawOrderAccessToken: null });
  });

  it("finalizes an accepted paid captured payment without Stripe calls", async () => {
    const db = {} as never;
    const capturedPayment = makePayment({
      state: "captured",
      amountCents: 625,
      stripePaymentIntentId: "pi_1",
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
    expect(result).toEqual({ payment: capturedPayment, rawOrderAccessToken: null });
  });

  it("logs and finalizes an accepted paid captured payment missing its Stripe PaymentIntent", async () => {
    const db = {} as never;
    const corruptPaidPayment = makePayment({
      state: "captured",
      amountCents: 625,
      stripePaymentIntentId: null,
      stripeChargeId: "ch_1",
    });
    mocks.getPaymentAttemptById.mockResolvedValue(corruptPaidPayment);

    const { settlePaymentForDispatchResolution } =
      await import("../src/workers/dispatch-settlement.js");

    const result = await settlePaymentForDispatchResolution(
      db,
      "draft-1",
      "payment-1",
      "accepted",
    );

    expect(result).toEqual({ payment: corruptPaidPayment, rawOrderAccessToken: null });
    expect(mocks.logger.error).toHaveBeenCalledWith(
      { paymentAttemptId: "payment-1", draftId: "draft-1" },
      expect.stringContaining("data integrity issue"),
    );
  });

  it("throws for a rejected paid captured payment missing its Stripe PaymentIntent", async () => {
    const db = {} as never;
    mocks.getPaymentAttemptById.mockResolvedValue(
      makePayment({
        state: "captured",
        amountCents: 625,
        stripePaymentIntentId: null,
        stripeChargeId: "ch_1",
      }),
    );

    const { settlePaymentForDispatchResolution } =
      await import("../src/workers/dispatch-settlement.js");

    await expect(
      settlePaymentForDispatchResolution(db, "draft-1", "payment-1", "rejected"),
    ).rejects.toThrow(
      "Paid payment payment-1 rejected but missing a Stripe PaymentIntent id",
    );
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });
});
