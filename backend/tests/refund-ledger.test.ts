import { describe, expect, it } from "vitest";
import {
  allocateRefundVat,
  deriveRefundState,
} from "../src/modules/payments/refund-ledger.service.js";

// Standard CHF 4.55: total 455, VAT 34 (round(455*810/10810)). Registered 9.15: VAT 69.
const receipt455 = { vatCents: 34, vatRateBp: 810 };
const receipt915 = { vatCents: 69, vatRateBp: 810 };

describe("allocateRefundVat — cumulative VAT allocation", () => {
  it("full refund of CHF 4.55 reverses exactly VAT 34 / net 421", () => {
    const a = allocateRefundVat([{ refundId: "re_1", amountCents: 455 }], receipt455);
    expect(a.get("re_1")).toEqual({ vatCents: 34, netCents: 421 });
  });

  it("CHF 4.55 partial refund of a CHF 9.15 sale → VAT 34 / net 421", () => {
    const a = allocateRefundVat([{ refundId: "re_1", amountCents: 455 }], receipt915);
    expect(a.get("re_1")).toEqual({ vatCents: 34, netCents: 421 });
  });

  it("two partials sum to exactly the original VAT (no rounding drift)", () => {
    const a = allocateRefundVat(
      [
        { refundId: "re_1", amountCents: 200 },
        { refundId: "re_2", amountCents: 255 },
      ],
      receipt455,
    );
    const r1 = a.get("re_1");
    const r2 = a.get("re_2");
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect((r1?.vatCents ?? 0) + (r2?.vatCents ?? 0)).toBe(34);
    // net + vat per refund equals its gross
    expect((r1?.vatCents ?? 0) + (r1?.netCents ?? 0)).toBe(200);
    expect((r2?.vatCents ?? 0) + (r2?.netCents ?? 0)).toBe(255);
  });

  it("full CHF 9.15 refund reverses exactly VAT 69 / net 846", () => {
    const a = allocateRefundVat([{ refundId: "re_1", amountCents: 915 }], receipt915);
    expect(a.get("re_1")).toEqual({ vatCents: 69, netCents: 846 });
  });
});

describe("deriveRefundState", () => {
  const amt = 455;
  it("no refunds → captured", () => {
    expect(deriveRefundState(amt, [])).toBe("captured");
  });
  it("a pending refund → refund_pending", () => {
    expect(deriveRefundState(amt, [{ status: "pending", amountCents: 455 }])).toBe(
      "refund_pending",
    );
  });
  it("succeeded gross >= amount → refunded", () => {
    expect(deriveRefundState(amt, [{ status: "succeeded", amountCents: 455 }])).toBe(
      "refunded",
    );
  });
  it("succeeded gross < amount → partially_refunded", () => {
    expect(deriveRefundState(amt, [{ status: "succeeded", amountCents: 200 }])).toBe(
      "partially_refunded",
    );
  });
  it("only a failed refund → captured (never 'failed')", () => {
    expect(deriveRefundState(amt, [{ status: "failed", amountCents: 455 }])).toBe(
      "captured",
    );
  });
});
