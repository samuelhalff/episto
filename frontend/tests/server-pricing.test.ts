import { afterEach, describe, expect, it, vi } from "vitest";
import { getServicePriceBand } from "../src/lib/server-pricing";

const validPayload = {
  standard: {
    totalCents: 755,
    displayPrice: "CHF 7.55",
    currency: "CHF",
    providerQuotedCents: 165,
    providerQuotedDisplayPrice: "CHF 1.65",
    swissMailMarkupCents: 590,
    swissMailMarkupDisplayPrice: "CHF 5.90",
  },
  registered: {
    totalCents: 1715,
    displayPrice: "CHF 17.15",
    currency: "CHF",
    providerQuotedCents: 625,
    providerQuotedDisplayPrice: "CHF 6.25",
    swissMailMarkupCents: 1090,
    swissMailMarkupDisplayPrice: "CHF 10.90",
  },
  registeredSurchargeCents: 960,
  registeredSurchargeDisplayPrice: "CHF 9.60",
  sync: {
    sourceLabel: "ePost active rate matrix",
    lastSyncedAt: "2026-07-23T12:55:07.674Z",
    freshness: "fresh",
  },
  providerBreakdown: {
    providerName: "ePost",
    note: "Public pricing examples come from the active stored provider rate matrix.",
    sourceUrl: "https://api.epost.ch/epost/preview/delivery-prices",
    verifiedDate: "2026-07-23",
    pricesExcludeVat: true,
    currency: "CHF",
    referenceScenario: {
      shippingCountry: "CH",
      envelopeSize: "C5",
      windowLocation: "RIGHT",
      duplex: false,
      attachmentMode: "none",
      standardPostage: "A_POST",
      registeredPostage: "REGISTERED",
    },
    pageCountExamples: {
      standard: [
        {
          pageCount: 1,
          providerQuotedCents: 165,
          providerQuotedDisplayPrice: "CHF 1.65",
          totalCents: 755,
          displayPrice: "CHF 7.55",
          currency: "CHF",
        },
      ],
      registered: [
        {
          pageCount: 1,
          providerQuotedCents: 625,
          providerQuotedDisplayPrice: "CHF 6.25",
          totalCents: 1715,
          displayPrice: "CHF 17.15",
          currency: "CHF",
        },
      ],
    },
  },
};

describe("getServicePriceBand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the postage-inclusive totals from the cached snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validPayload,
      }),
    );

    const band = await getServicePriceBand();
    expect(band).toEqual({ lowPrice: "7.55", highPrice: "17.15", currency: "CHF" });
  });

  it("returns null on a non-ok response (never advertises a wrong price)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    expect(await getServicePriceBand()).toBeNull();
  });

  it("returns null when the backend is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    expect(await getServicePriceBand()).toBeNull();
  });

  it("returns null on a schema-invalid payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nope: true }) }),
    );
    expect(await getServicePriceBand()).toBeNull();
  });
});
