import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../src/shared/errors/index.js";

const { mockGetDb, mockGetPublicPricing } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetPublicPricing: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: mockGetDb,
}));

vi.mock("../src/modules/pricing/index.js", () => ({
  getPublicPricing: mockGetPublicPricing,
}));

import { pricingRoutes } from "../src/modules/pricing/pricing.routes.js";

describe("pricing routes", () => {
  const db = { tag: "pricing-db" };

  beforeEach(() => {
    mockGetDb.mockReset();
    mockGetPublicPricing.mockReset();
    mockGetDb.mockReturnValue(db);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function buildTestApp() {
    const app = Fastify();
    app.setErrorHandler((error, request, reply) => {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send(error.toResponse(request.id));
        return;
      }

      throw error;
    });

    await app.register(pricingRoutes);
    return app;
  }

  it("returns sync metadata and a matrix-backed provider breakdown", async () => {
    mockGetPublicPricing.mockResolvedValue({
      standard: {
        totalCents: 495,
        displayPrice: "CHF 4.95",
        currency: "CHF",
        providerQuotedCents: 155,
        providerQuotedDisplayPrice: "CHF 1.55",
        swissMailMarkupCents: 340,
        swissMailMarkupDisplayPrice: "CHF 3.40",
      },
      registered: {
        totalCents: 918,
        displayPrice: "CHF 9.18",
        currency: "CHF",
        providerQuotedCents: 578,
        providerQuotedDisplayPrice: "CHF 5.78",
        swissMailMarkupCents: 340,
        swissMailMarkupDisplayPrice: "CHF 3.40",
      },
      registeredSurchargeCents: 423,
      registeredSurchargeDisplayPrice: "CHF 4.23",
      sync: {
        sourceLabel: "ePost active rate matrix",
        lastSyncedAt: "2026-04-07T06:00:00.000Z",
        freshness: "fresh",
      },
      providerBreakdown: {
        providerName: "ePost",
        note: "Public pricing examples come from the active stored provider rate matrix for Swiss domestic no-attachment letters.",
        sourceUrl: "https://www.epost.ch/en/business-customers/digital-letter",
        verifiedDate: "2026-04-07",
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
              providerQuotedCents: 155,
              providerQuotedDisplayPrice: "CHF 1.55",
              totalCents: 495,
              displayPrice: "CHF 4.95",
              currency: "CHF",
            },
          ],
          registered: [
            {
              pageCount: 1,
              providerQuotedCents: 578,
              providerQuotedDisplayPrice: "CHF 5.78",
              totalCents: 918,
              displayPrice: "CHF 9.18",
              currency: "CHF",
            },
          ],
        },
        pricesExcludeVat: true,
        currency: "CHF",
      },
    });

    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/pricing",
    });

    expect(response.statusCode).toBe(200);
    expect(mockGetPublicPricing).toHaveBeenCalledWith(db);
    expect(response.json()).toMatchObject({
      sync: {
        freshness: "fresh",
      },
      providerBreakdown: {
        referenceScenario: {
          attachmentMode: "none",
          envelopeSize: "C5",
        },
        pageCountExamples: {
          standard: [
            {
              pageCount: 1,
              providerQuotedCents: 155,
            },
          ],
        },
      },
    });

    await app.close();
  });

  it("returns a 503 error envelope when pricing is unavailable", async () => {
    mockGetPublicPricing.mockRejectedValue(
      new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "PRICING_UNAVAILABLE",
        message:
          "Public pricing is unavailable because no usable active provider rate matrix exists.",
        userMessage: "Pricing is temporarily unavailable.",
        userAction: "Please try again shortly.",
      }),
    );

    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/pricing",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      error: {
        code: "PRICING_UNAVAILABLE",
        family: "provider_outage",
        userMessage: "Pricing is temporarily unavailable.",
      },
    });

    await app.close();
  });
});
