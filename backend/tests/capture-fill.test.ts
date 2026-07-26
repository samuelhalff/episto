import { describe, expect, it } from "vitest";
import { captureFillValues } from "../src/modules/payments/payment.service.js";

const bare = { capturedAt: null, stripeFeeCents: null, stripeBalanceTransactionId: null };

describe("captureFillValues — immutable capture time + actual fee", () => {
  it("fills captured_at + source when missing", () => {
    const at = new Date("2026-07-10T10:00:00Z");
    expect(
      captureFillValues(bare, { capturedAt: at, capturedAtSource: "webhook" }),
    ).toEqual({
      capturedAt: at,
      capturedAtSource: "webhook",
    });
  });

  it("NEVER overwrites an existing capture time (webhook retry)", () => {
    const existing = { ...bare, capturedAt: new Date("2026-07-10T10:00:00Z") };
    const fills = captureFillValues(existing, {
      capturedAt: new Date("2026-07-10T11:00:00Z"),
      capturedAtSource: "webhook",
    });
    expect(fills.capturedAt).toBeUndefined();
  });

  it("fills the fee triple only all-or-nothing", () => {
    const at = new Date();
    expect(
      captureFillValues(bare, {
        stripeFeeCents: 43,
        stripeFeeCurrency: "CHF",
        stripeFeeRecordedAt: at,
      }),
    ).toEqual({ stripeFeeCents: 43, stripeFeeCurrency: "CHF", stripeFeeRecordedAt: at });
    // partial fee (missing currency/recordedAt) → not written
    expect(captureFillValues(bare, { stripeFeeCents: 43 })).toEqual({});
  });

  it("does not overwrite an already-recorded fee", () => {
    const existing = { ...bare, stripeFeeCents: 40 };
    const fills = captureFillValues(existing, {
      stripeFeeCents: 43,
      stripeFeeCurrency: "CHF",
      stripeFeeRecordedAt: new Date(),
    });
    expect(fills.stripeFeeCents).toBeUndefined();
  });

  it("fills the balance-transaction id independently when missing", () => {
    expect(captureFillValues(bare, { stripeBalanceTransactionId: "txn_1" })).toEqual({
      stripeBalanceTransactionId: "txn_1",
    });
  });
});
