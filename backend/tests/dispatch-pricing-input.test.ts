import { describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
  }),
}));

describe("dispatch pricing input", () => {
  it("normalizes Episto's fixed pricing dimensions", async () => {
    const { buildDispatchPricingInput } =
      await import("../src/modules/dispatch/dispatch-pricing-input.service.js");

    const input = buildDispatchPricingInput({
      draftId: "11111111-1111-4111-8111-111111111111",
      snapshotId: null,
      deliveryType: "registered",
      estimatedPages: 3,
      attachmentCount: 1,
    });

    expect(input).toMatchObject({
      postage: "REGISTERED",
      numberOfPage: 3,
      attachmentMode: "single_hint",
      shippingCountry: "CH",
      envelopeSize: "C5",
      windowLocation: "RIGHT",
      duplex: false,
    });
  });

  it("derives a stable hash from pricing-relevant fields only", async () => {
    const { hashDispatchPricingInput } =
      await import("../src/modules/dispatch/dispatch-pricing-input.service.js");

    const hash = hashDispatchPricingInput({
      deliveryType: "standard",
      postage: "A_POST",
      numberOfPage: 2,
      attachmentMode: "none",
      shippingCountry: "CH",
      envelopeSize: "C5",
      windowLocation: "RIGHT",
      duplex: false,
    });

    expect(hash).toHaveLength(64);
  });
});
