import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tx: { select: vi.fn(), update: vi.fn() },
  db: { transaction: vi.fn() },
  createPaymentAttempt: vi.fn(),
  getPaymentForDraft: vi.fn(),
  transitionPaymentState: vi.fn(),
  recordPromoRedemption: vi.fn(),
  syncDraftFulfillmentFromPaymentState: vi.fn(),
  issueReceiptForCapturedPayment: vi.fn(),
  enqueueDispatchIfEligible: vi.fn(),
  recordEvent: vi.fn(),
  sendGa4Purchase: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => mocks.db,
  schema: {
    draftLetters: { id: "draft_id" },
    sessions: { id: "session_id" },
  },
}));

vi.mock("../src/modules/payments/payment.service.js", () => ({
  createPaymentAttempt: mocks.createPaymentAttempt,
  getPaymentForDraft: mocks.getPaymentForDraft,
  transitionPaymentState: mocks.transitionPaymentState,
}));

vi.mock("../src/modules/payments/promo.service.js", () => ({
  recordPromoRedemption: mocks.recordPromoRedemption,
}));

vi.mock("../src/modules/payments/receipt.service.js", () => ({
  issueReceiptForCapturedPayment: mocks.issueReceiptForCapturedPayment,
}));

vi.mock("../src/modules/payments/payment-route-helpers.js", () => ({
  enqueueDispatchIfEligible: mocks.enqueueDispatchIfEligible,
}));

vi.mock("../src/modules/signing/fulfillment.service.js", () => ({
  syncDraftFulfillmentFromPaymentState: mocks.syncDraftFulfillmentFromPaymentState,
}));

vi.mock("../src/modules/analytics/index.js", () => ({
  recordEvent: mocks.recordEvent,
}));

vi.mock("../src/modules/analytics/ga4-measurement-protocol.js", () => ({
  sendGa4Purchase: mocks.sendGa4Purchase,
}));

import { checkoutFreeOrder } from "../src/modules/payments/free-order.service.js";

const input = {
  draftId: "draft-1",
  sessionId: "session-1",
  email: "payer@example.com",
  promoCodeId: "promo-1",
  signatureFlowMode: "visual",
  verifiedPhone: {
    phoneE164: "+41791234567",
    phoneVerifiedAt: new Date("2026-06-04T12:00:00.000Z"),
  },
  orderBreakdown: { totalCents: 0 } as never,
  deliveryType: "standard",
  log: { error: vi.fn(), warn: vi.fn() },
};

describe("free order GA4 reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ for: vi.fn().mockResolvedValue([{ id: "draft-1" }]) })),
      })),
    });
    mocks.tx.update.mockReturnValue({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
    });
    mocks.db.transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => unknown) => callback(mocks.tx),
    );
    mocks.getPaymentForDraft.mockResolvedValue(null);
    mocks.recordPromoRedemption.mockResolvedValue(true);
    mocks.createPaymentAttempt.mockResolvedValue({ id: "payment-1", state: "pending" });
    mocks.transitionPaymentState.mockResolvedValue({
      payment: {
        id: "payment-1",
        state: "captured",
        amountCents: 0,
        currency: "CHF",
        gaClientId: "1234567890.1699999999",
      },
      rawOrderAccessToken: null,
    });
    mocks.syncDraftFulfillmentFromPaymentState.mockResolvedValue(undefined);
    mocks.issueReceiptForCapturedPayment.mockResolvedValue(undefined);
    mocks.enqueueDispatchIfEligible.mockResolvedValue(undefined);
  });

  it("persists the attribution on the free-order payment attempt", async () => {
    await checkoutFreeOrder(mocks.db as never, {
      ...input,
      attribution: { gaClientId: "1234567890.1699999999", utmSource: "newsletter" },
    });

    expect(mocks.createPaymentAttempt).toHaveBeenCalledWith(
      mocks.tx,
      expect.objectContaining({
        attribution: { gaClientId: "1234567890.1699999999", utmSource: "newsletter" },
      }),
    );
  });

  it("reports a CHF 0 order as a zero-value purchase rather than skipping it", async () => {
    await checkoutFreeOrder(mocks.db as never, input);

    // The confirmation page fires its `purchase` for a free order too. If the
    // server suppressed this one the two emitters would disagree about which
    // transactions exist, and de-duplication only works when they agree.
    expect(mocks.sendGa4Purchase).toHaveBeenCalledWith({
      draftId: "draft-1",
      gaClientId: "1234567890.1699999999",
      valueCents: 0,
      currency: "CHF",
    });
  });

  it("does not re-report an order that was already captured", async () => {
    mocks.getPaymentForDraft.mockResolvedValue({
      id: "payment-existing",
      state: "captured",
      amountCents: 0,
      currency: "CHF",
      gaClientId: null,
    });

    await checkoutFreeOrder(mocks.db as never, input);

    expect(mocks.sendGa4Purchase).not.toHaveBeenCalled();
  });
});
