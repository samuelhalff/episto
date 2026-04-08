import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    transaction: vi.fn(),
  },
  tx: {
    tag: "tx",
  },
  getPaymentForDraft: vi.fn(),
  transitionPaymentState: vi.fn(),
  cancelPaymentIntent: vi.fn(),
}));

vi.mock("../src/modules/payments/payment.service.js", () => ({
  getPaymentForDraft: mocks.getPaymentForDraft,
  transitionPaymentState: mocks.transitionPaymentState,
}));

vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  cancelPaymentIntent: mocks.cancelPaymentIntent,
}));

import { cancelPendingDraftPayment } from "../src/modules/payments/payment-cancellation.service.js";

describe("cancelPendingDraftPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.transaction.mockImplementation(
      async (
        callback: (tx: typeof mocks.tx) => Promise<unknown>,
        _config?: { isolationLevel?: string },
      ) => callback(mocks.tx),
    );
  });

  it("runs stale checkout cancellation in a serializable transaction", async () => {
    mocks.getPaymentForDraft.mockResolvedValue({
      id: "payment-1",
      state: "pending",
      stripePaymentIntentId: "pi_pending_1",
    });

    await cancelPendingDraftPayment(mocks.db as never, "draft-1");

    expect(mocks.db.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "serializable",
    });
    expect(mocks.getPaymentForDraft).toHaveBeenCalledWith(mocks.tx, "draft-1");
    expect(mocks.cancelPaymentIntent).toHaveBeenCalledWith("pi_pending_1");
    expect(mocks.transitionPaymentState).toHaveBeenCalledWith(
      mocks.tx,
      "payment-1",
      "cancelled",
    );
  });
});
