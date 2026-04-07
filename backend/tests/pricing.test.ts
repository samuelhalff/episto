import { describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    PRICE_STANDARD_MARKUP_CENTS: 340,
    PRICE_REGISTERED_MARKUP_CENTS: 340,
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
  }),
}));

import {
  buildPublicPricingResponse,
  formatCHF,
  selectCanonicalActivePublicPricingVersion,
} from "../src/modules/pricing/public-pricing.service.js";

function createMatrixVersion(overrides?: Partial<Parameters<typeof buildPublicPricingResponse>[0]["version"]>) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    providerName: "epost",
    status: "active" as const,
    verifiedAt: new Date("2026-04-07T06:00:00.000Z"),
    effectiveAt: new Date("2026-04-07T06:00:00.000Z"),
    expiresAt: new Date("2026-04-08T06:00:00.000Z"),
    sourceEndpoint: "https://www.epost.ch/en/business-customers/digital-letter",
    createdAt: new Date("2026-04-07T05:55:00.000Z"),
    updatedAt: new Date("2026-04-07T06:00:00.000Z"),
    ...overrides,
  };
}

function createMatrixEntries() {
  return [
    { postage: "A_POST", numberOfPage: 1, providerQuotedCents: 155 },
    { postage: "A_POST", numberOfPage: 2, providerQuotedCents: 170 },
    { postage: "A_POST", numberOfPage: 3, providerQuotedCents: 185 },
    { postage: "A_POST", numberOfPage: 4, providerQuotedCents: 200 },
    { postage: "A_POST", numberOfPage: 5, providerQuotedCents: 215 },
    { postage: "REGISTERED", numberOfPage: 1, providerQuotedCents: 578 },
    { postage: "REGISTERED", numberOfPage: 2, providerQuotedCents: 593 },
    { postage: "REGISTERED", numberOfPage: 3, providerQuotedCents: 608 },
    { postage: "REGISTERED", numberOfPage: 4, providerQuotedCents: 623 },
    { postage: "REGISTERED", numberOfPage: 5, providerQuotedCents: 638 },
  ].map((entry, index) => ({
    id: `22222222-2222-4222-8222-${(index + 1).toString().padStart(12, "0")}`,
    versionId: "11111111-1111-4111-8111-111111111111",
    attachmentMode: "none" as const,
    shippingCountry: "CH" as const,
    envelopeSize: "C5" as const,
    windowLocation: "LEFT" as const,
    duplex: false as const,
    currency: "CHF" as const,
    providerQuoteReference: null,
    verifiedAt: new Date("2026-04-07T06:00:00.000Z"),
    createdAt: new Date("2026-04-07T06:00:00.000Z"),
    ...entry,
  }));
}

describe("public pricing service", () => {
  it("maps an active rate matrix into public totals, sync metadata, and examples", () => {
    const result = buildPublicPricingResponse({
      version: createMatrixVersion(),
      entries: createMatrixEntries(),
      now: new Date("2026-04-07T12:00:00.000Z"),
    });

    expect(result.standard).toEqual({
      totalCents: 495,
      displayPrice: "CHF 4.95",
      currency: "CHF",
      providerQuotedCents: 155,
      providerQuotedDisplayPrice: "CHF 1.55",
      swissMailMarkupCents: 340,
      swissMailMarkupDisplayPrice: "CHF 3.40",
    });
    expect(result.registered).toEqual({
      totalCents: 918,
      displayPrice: "CHF 9.18",
      currency: "CHF",
      providerQuotedCents: 578,
      providerQuotedDisplayPrice: "CHF 5.78",
      swissMailMarkupCents: 340,
      swissMailMarkupDisplayPrice: "CHF 3.40",
    });
    expect(result.registeredSurchargeCents).toBe(423);
    expect(result.sync).toEqual({
      sourceLabel: "ePost active rate matrix",
      lastSyncedAt: "2026-04-07T06:00:00.000Z",
      freshness: "fresh",
    });
    expect(result.providerBreakdown.referenceScenario).toEqual({
      shippingCountry: "CH",
      envelopeSize: "C5",
      windowLocation: "LEFT",
      duplex: false,
      attachmentMode: "none",
      standardPostage: "A_POST",
      registeredPostage: "REGISTERED",
    });
    expect(result.providerBreakdown.pageCountExamples.standard).toHaveLength(5);
    expect(result.providerBreakdown.pageCountExamples.standard[0]).toEqual({
      pageCount: 1,
      providerQuotedCents: 155,
      providerQuotedDisplayPrice: "CHF 1.55",
      totalCents: 495,
      displayPrice: "CHF 4.95",
      currency: "CHF",
    });
    expect(result.providerBreakdown.pageCountExamples.registered[4]).toEqual({
      pageCount: 5,
      providerQuotedCents: 638,
      providerQuotedDisplayPrice: "CHF 6.38",
      totalCents: 978,
      displayPrice: "CHF 9.78",
      currency: "CHF",
    });
  });

  it("marks sync freshness stale when the active rate matrix is expired", () => {
    const result = buildPublicPricingResponse({
      version: createMatrixVersion({
        expiresAt: new Date("2026-04-07T05:59:59.000Z"),
      }),
      entries: createMatrixEntries(),
      now: new Date("2026-04-07T12:00:00.000Z"),
    });

    expect(result.sync.freshness).toBe("stale");
  });

  it("marks sync freshness stale when the active rate matrix expires exactly now", () => {
    const now = new Date("2026-04-07T12:00:00.000Z");
    const result = buildPublicPricingResponse({
      version: createMatrixVersion({
        expiresAt: now,
      }),
      entries: createMatrixEntries(),
      now,
    });

    expect(result.sync.freshness).toBe("stale");
  });

  it("marks sync freshness stale when the active rate matrix has no expiry boundary", () => {
    const result = buildPublicPricingResponse({
      version: createMatrixVersion({
        expiresAt: null,
      }),
      entries: createMatrixEntries(),
      now: new Date("2026-04-07T12:00:00.000Z"),
    });

    expect(result.sync.freshness).toBe("stale");
  });

  it("fails clearly when there is no usable active rate matrix", () => {
    try {
      buildPublicPricingResponse({
        version: null,
        entries: [],
        now: new Date("2026-04-07T12:00:00.000Z"),
      });
      throw new Error("expected public pricing to fail");
    } catch (error) {
      expect(error).toMatchObject({
        family: "provider_outage",
        statusCode: 503,
        code: "PRICING_UNAVAILABLE",
        message:
          "Public pricing is unavailable because no usable active provider rate matrix exists.",
      });
    }
  });

  it("fails clearly when required reference rows are missing", () => {
    try {
      buildPublicPricingResponse({
        version: createMatrixVersion(),
        entries: createMatrixEntries().filter(
          (entry) => !(entry.postage === "REGISTERED" && entry.numberOfPage === 5),
        ),
        now: new Date("2026-04-07T12:00:00.000Z"),
      });
      throw new Error("expected public pricing to fail");
    } catch (error) {
      expect(error).toMatchObject({
        family: "provider_outage",
        statusCode: 503,
        code: "PRICING_UNAVAILABLE",
      });
    }
  });

  it("fails with a pricing unavailable error when active matrix metadata is unusable", () => {
    try {
      buildPublicPricingResponse({
        version: createMatrixVersion({
          providerName: "   ",
          sourceEndpoint: "not-a-url",
        }),
        entries: createMatrixEntries(),
        now: new Date("2026-04-07T12:00:00.000Z"),
      });
      throw new Error("expected public pricing to fail");
    } catch (error) {
      expect(error).toMatchObject({
        family: "provider_outage",
        statusCode: 503,
        code: "PRICING_UNAVAILABLE",
      });
    }
  });

  it("fails clearly when the active matrix has a non-http source url", () => {
    try {
      buildPublicPricingResponse({
        version: createMatrixVersion({
          sourceEndpoint: "javascript:alert('pricing')",
        }),
        entries: createMatrixEntries(),
        now: new Date("2026-04-07T12:00:00.000Z"),
      });
      throw new Error("expected public pricing to fail");
    } catch (error) {
      expect(error).toMatchObject({
        family: "provider_outage",
        statusCode: 503,
        code: "PRICING_UNAVAILABLE",
        message:
          "Public pricing is unavailable because the active provider rate matrix has an invalid source URL.",
      });
    }
  });

  it("fails clearly when the active matrix makes registered cheaper than standard", () => {
    try {
      buildPublicPricingResponse({
        version: createMatrixVersion(),
        entries: createMatrixEntries().map((entry) =>
          entry.postage === "REGISTERED" && entry.numberOfPage === 1
            ? {
                ...entry,
                providerQuotedCents: 100,
              }
            : entry,
        ),
        now: new Date("2026-04-07T12:00:00.000Z"),
      });
      throw new Error("expected public pricing to fail");
    } catch (error) {
      expect(error).toMatchObject({
        family: "provider_outage",
        statusCode: 503,
        code: "PRICING_UNAVAILABLE",
        message:
          "Public pricing is unavailable because the registered rate is lower than the standard rate in the active matrix.",
      });
    }
  });

  it("selects the canonical active matrix by effective freshness instead of updatedAt", () => {
    const canonical = createMatrixVersion({
      id: "11111111-1111-4111-8111-111111111112",
      effectiveAt: new Date("2026-04-08T06:00:00.000Z"),
      verifiedAt: new Date("2026-04-08T06:00:00.000Z"),
      updatedAt: new Date("2026-04-08T05:00:00.000Z"),
    });
    const metadataEditedOlderRow = createMatrixVersion({
      id: "11111111-1111-4111-8111-111111111113",
      effectiveAt: new Date("2026-04-07T06:00:00.000Z"),
      verifiedAt: new Date("2026-04-07T06:00:00.000Z"),
      updatedAt: new Date("2026-04-09T06:00:00.000Z"),
    });

    const result = selectCanonicalActivePublicPricingVersion([
      metadataEditedOlderRow,
      canonical,
    ]);

    expect(result?.id).toBe(canonical.id);
  });

  it("falls back to effectiveAt when verifiedAt is unavailable", () => {
    const newerEffectiveAt = createMatrixVersion({
      id: "11111111-1111-4111-8111-111111111118",
      effectiveAt: new Date("2026-04-08T06:00:00.000Z"),
      verifiedAt: null,
    });
    const olderEffectiveAt = createMatrixVersion({
      id: "11111111-1111-4111-8111-111111111119",
      effectiveAt: new Date("2026-04-07T06:00:00.000Z"),
      verifiedAt: null,
    });

    const result = selectCanonicalActivePublicPricingVersion([
      olderEffectiveAt,
      newerEffectiveAt,
    ]);

    expect(result?.id).toBe(newerEffectiveAt.id);
  });

  it("fails clearly when active matrix freshness signals are ambiguous", () => {
    try {
      selectCanonicalActivePublicPricingVersion([
        createMatrixVersion({
          id: "11111111-1111-4111-8111-111111111114",
          effectiveAt: new Date("2026-04-08T06:00:00.000Z"),
          verifiedAt: new Date("2026-04-08T06:00:00.000Z"),
          createdAt: new Date("2026-04-08T05:55:00.000Z"),
          updatedAt: new Date("2026-04-09T06:00:00.000Z"),
        }),
        createMatrixVersion({
          id: "11111111-1111-4111-8111-111111111115",
          effectiveAt: new Date("2026-04-08T06:00:00.000Z"),
          verifiedAt: new Date("2026-04-08T06:00:00.000Z"),
          createdAt: new Date("2026-04-08T05:55:00.000Z"),
          updatedAt: new Date("2026-04-10T06:00:00.000Z"),
        }),
      ]);
      throw new Error("expected public pricing to fail");
    } catch (error) {
      expect(error).toMatchObject({
        family: "provider_outage",
        statusCode: 503,
        code: "PRICING_UNAVAILABLE",
        message:
          "Public pricing is unavailable because the active provider rate matrix selection is ambiguous.",
      });
    }
  });

  it("prefers the latest effectiveAt even when another row has a newer verifiedAt", () => {
    const newerEffectiveAt = createMatrixVersion({
      id: "11111111-1111-4111-8111-111111111116",
      effectiveAt: new Date("2026-04-09T06:00:00.000Z"),
      verifiedAt: new Date("2026-04-07T06:00:00.000Z"),
      createdAt: new Date("2026-04-07T05:55:00.000Z"),
    });
    const newerVerifiedAtOnly = createMatrixVersion({
      id: "11111111-1111-4111-8111-111111111117",
      effectiveAt: new Date("2026-04-08T06:00:00.000Z"),
      verifiedAt: new Date("2026-04-10T06:00:00.000Z"),
      createdAt: new Date("2026-04-08T05:55:00.000Z"),
    });

    const result = selectCanonicalActivePublicPricingVersion([
      newerVerifiedAtOnly,
      newerEffectiveAt,
    ]);

    expect(result?.id).toBe(newerEffectiveAt.id);
  });
});

describe("formatCHF", () => {
  it("formats cents as a CHF string", () => {
    expect(formatCHF(490)).toBe("CHF 4.90");
    expect(formatCHF(0)).toBe("CHF 0.00");
    expect(formatCHF(5)).toBe("CHF 0.05");
  });
});
