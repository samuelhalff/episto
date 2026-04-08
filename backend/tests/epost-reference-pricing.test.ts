import { describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    EPOST_API_BASE_URL: "https://api.epost.ch",
    EPOST_API_KEY: "test-api-key",
    EPOST_TIMEOUT_MS: 5_000,
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
  }),
}));

import { EpostDispatchAdapter } from "../src/modules/dispatch/adapters/epost.adapter.js";
import type { DispatchPricingInput } from "../src/modules/dispatch/dispatch-pricing-input.service.js";

const baseInput: DispatchPricingInput = {
  deliveryType: "registered",
  postage: "REGISTERED",
  numberOfPage: 2,
  attachmentMode: "none",
  shippingCountry: "CH",
  envelopeSize: "C5",
  windowLocation: "LEFT",
  duplex: false,
};

describe("EpostDispatchAdapter.quoteReferencePrice", () => {
  it("returns the physical preview price for the canonical reference probe", async () => {
    const adapter = new EpostDispatchAdapter();
    const requestJson = vi.spyOn(adapter as never, "requestJson");
    const pollPreviewResult = vi.spyOn(adapter as never, "pollPreviewResult");

    requestJson.mockResolvedValueOnce({ id: "preview-123" });
    pollPreviewResult.mockResolvedValueOnce({
      status: "FINISHED",
      pricePreview: [
        {
          potentialPrices: [
            { channel: "DIGITAL", price: 0.5 },
            { channel: "PHYSICAL", price: 3.35 },
          ],
        },
      ],
    });

    await expect(adapter.quoteReferencePrice(baseInput)).resolves.toEqual({
      providerQuotedCents: 335,
      providerQuoteReference: "preview-123",
      quotedAt: null,
    });
  });

  it("throws a provider outage error when the provider does not return a physical price", async () => {
    const adapter = new EpostDispatchAdapter();
    const requestJson = vi.spyOn(adapter as never, "requestJson");
    const pollPreviewResult = vi.spyOn(adapter as never, "pollPreviewResult");

    requestJson.mockResolvedValueOnce({ id: "preview-456" });
    pollPreviewResult.mockResolvedValueOnce({
      status: "FINISHED",
      pricePreview: [
        {
          potentialPrices: [{ channel: "DIGITAL", price: 0.5 }],
        },
      ],
    });

    await expect(adapter.quoteReferencePrice(baseInput)).rejects.toMatchObject({
      code: "EPOST_REFERENCE_PRICING_UNAVAILABLE",
      family: "provider_outage",
      statusCode: 503,
    });
  });
});
