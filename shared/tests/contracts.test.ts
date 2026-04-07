import { describe, expect, it } from "vitest";

import {
  DraftDispatchQuoteResponseSchema,
  DraftFilesResponseSchema,
  PublicPricingResponseSchema,
} from "../src/contracts/index.ts";

function createPublicPricingResponse() {
  return {
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
      freshness: "fresh" as const,
    },
    providerBreakdown: {
      providerName: "ePost",
      note: "Public pricing examples come from the active stored provider rate matrix for Swiss domestic no-attachment letters.",
      sourceUrl: "https://www.epost.ch/en/business-customers/digital-letter",
      verifiedDate: "2026-04-07",
      referenceScenario: {
        shippingCountry: "CH" as const,
        envelopeSize: "C5" as const,
        windowLocation: "LEFT" as const,
        duplex: false as const,
        attachmentMode: "none" as const,
        standardPostage: "A_POST" as const,
        registeredPostage: "REGISTERED" as const,
      },
      pageCountExamples: {
        standard: [
          {
            pageCount: 1,
            providerQuotedCents: 155,
            providerQuotedDisplayPrice: "CHF 1.55",
            totalCents: 495,
            displayPrice: "CHF 4.95",
            currency: "CHF" as const,
          },
          {
            pageCount: 2,
            providerQuotedCents: 170,
            providerQuotedDisplayPrice: "CHF 1.70",
            totalCents: 510,
            displayPrice: "CHF 5.10",
            currency: "CHF" as const,
          },
        ],
        registered: [
          {
            pageCount: 1,
            providerQuotedCents: 578,
            providerQuotedDisplayPrice: "CHF 5.78",
            totalCents: 918,
            displayPrice: "CHF 9.18",
            currency: "CHF" as const,
          },
          {
            pageCount: 2,
            providerQuotedCents: 593,
            providerQuotedDisplayPrice: "CHF 5.93",
            totalCents: 933,
            displayPrice: "CHF 9.33",
            currency: "CHF" as const,
          },
        ],
      },
      pricesExcludeVat: true,
      currency: "CHF" as const,
    },
  };
}

describe("shared contract schemas", () => {
  it("parses a draft files response with attachment constraints", () => {
    const result = DraftFilesResponseSchema.parse({
      files: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          sessionId: "22222222-2222-4222-8222-222222222222",
          draftId: "33333333-3333-4333-8333-333333333333",
          kind: "attachment",
          storageKey: "attachments/session/file",
          originalFilename: "support.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          sortOrder: null,
          status: "active",
          deletedAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      attachmentConstraints: {
        maxAttachmentsPerDraft: 1,
        maxFileBytes: 5 * 1024 * 1024,
        maxTotalBytes: 20 * 1024 * 1024,
        allowedMimeTypes: ["application/pdf"],
      },
    });

    expect(result.files).toHaveLength(1);
    expect(result.attachmentConstraints.allowedMimeTypes).toEqual(["application/pdf"]);
  });

  it("parses the matrix-backed public pricing response used by marketing surfaces", () => {
    const result = PublicPricingResponseSchema.parse(createPublicPricingResponse());

    expect(result.registered.totalCents).toBe(918);
    expect(result.providerBreakdown.referenceScenario.attachmentMode).toBe("none");
    expect(result.providerBreakdown.pageCountExamples.standard[1]?.pageCount).toBe(2);
  });

  it("requires sync metadata on the public pricing response", () => {
    const result = PublicPricingResponseSchema.parse(createPublicPricingResponse());

    expect(result.sync.freshness).toBe("fresh");
    expect(result.sync.lastSyncedAt).toBe("2026-04-07T06:00:00.000Z");
  });

  it("rejects unsupported public pricing freshness values", () => {
    const response = createPublicPricingResponse();

    expect(() =>
      PublicPricingResponseSchema.parse({
        ...response,
        sync: {
          ...response.sync,
          freshness: "late",
        },
      }),
    ).toThrow();
  });

  it("parses a dispatch quote response with backend quote metadata", () => {
    const result = DraftDispatchQuoteResponseSchema.parse({
      quote: {
        draftId: "11111111-1111-4111-8111-111111111111",
        snapshotId: "22222222-2222-4222-8222-222222222222",
        deliveryType: "registered",
        providerQuotedCents: 625,
        swissMailMarkupCents: 340,
        totalCents: 965,
        currency: "CHF",
        providerQuoteReference: "preview-123",
        attachmentHandling: "single_hint",
        lineItems: [
          { label: "ePost provider quote", amountCents: 625, source: "provider" },
          { label: "Swiss Mail service", amountCents: 340, source: "swiss_mail" },
        ],
      },
      meta: {
        source: "matrix",
        quotedAt: "2026-04-07T12:00:00.000Z",
        expiresAt: "2026-04-08T12:00:00.000Z",
      },
    });

    expect(result.meta.source).toBe("matrix");
    expect(result.quote.totalCents).toBe(965);
  });
});
