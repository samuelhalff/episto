import { describe, expect, it } from "vitest";

import {
  deriveSuspiciousCategories,
  isSupportedEscalationLevel,
  resolveSuspiciousWindow,
} from "../src/modules/admin/admin-flags.routes.js";

describe("admin suspicious flags helpers", () => {
  it("flags repeated payment failures as payment abuse", () => {
    expect(
      deriveSuspiciousCategories({
        failedPayments: 3,
        refunds: 0,
        rejectedDispatches: 0,
        ambiguousDispatches: 0,
      }),
    ).toContain("payment_abuse");
  });

  it("flags mixed failed-payment and ambiguous-dispatch patterns", () => {
    expect(
      deriveSuspiciousCategories({
        failedPayments: 2,
        refunds: 0,
        rejectedDispatches: 0,
        ambiguousDispatches: 1,
      }),
    ).toContain("mixed_suspicious_behavior");
  });

  it("accepts only the supported escalation levels", () => {
    expect(isSupportedEscalationLevel("observe")).toBe(true);
    expect(isSupportedEscalationLevel("review")).toBe(true);
    expect(isSupportedEscalationLevel("manual_review")).toBe(true);
    expect(isSupportedEscalationLevel("incident")).toBe(true);
    expect(isSupportedEscalationLevel("bogus")).toBe(false);
  });

  it("resolves the first and last suspicious timestamps from active signals", () => {
    expect(
      resolveSuspiciousWindow([
        { firstSeenAt: "2026-04-01T10:00:00.000Z", lastSeenAt: "2026-04-02T10:00:00.000Z" },
        { firstSeenAt: null, lastSeenAt: null },
        { firstSeenAt: "2026-04-03T10:00:00.000Z", lastSeenAt: "2026-04-04T10:00:00.000Z" },
      ]),
    ).toEqual({
      firstSeenAt: "2026-04-01T10:00:00.000Z",
      lastSeenAt: "2026-04-04T10:00:00.000Z",
    });
  });
});
