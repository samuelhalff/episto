import { describe, expect, it } from "vitest";

import {
  DraftFilesResponseSchema,
  PublicPricingResponseSchema,
} from "../src/contracts/index.ts";

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

  it("parses the public pricing response used by marketing surfaces", () => {
    const result = PublicPricingResponseSchema.parse({
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
        sourceLabel: "ePost daily sync",
        lastSyncedAt: "2026-04-03T06:00:00.000Z",
        freshness: "fresh",
      },
      providerBreakdown: {
        providerName: "ePost",
        note: "Reference scenario verified against official ePost public pricing inputs for one printed page, one A4 sheet, one C5 envelope, and the currently configured postage mapping.",
        sourceUrl: "https://www.epost.ch/en/business-customers/digital-letter",
        verifiedDate: "2026-04-03",
        perPrintedPageCents: 5,
        perA4SheetCents: 10,
        envelopeC5Cents: 30,
        envelopeC4Cents: 60,
        postageCents: {
          A_POST: 110,
          B_POST: 92,
          B_POST_LARGEVOLUME: 60,
          A_PLUS: 267,
          REGISTERED: 533,
        },
        firstSheetC5Cents: {
          simplexCents: 45,
          duplexCents: 50,
        },
        additionalA4SheetCents: {
          simplexCents: 15,
          duplexCents: 20,
        },
        referenceScenario: {
          printedPages: 1,
          physicalSheets: 1,
          envelopeFormat: "C5",
          standardPostage: "A_POST",
          registeredPostage: "REGISTERED",
        },
        pricesExcludeVat: true,
        currency: "CHF",
      },
    });

    expect(result.registered.totalCents).toBe(918);
    expect(result.providerBreakdown.firstSheetC5Cents.duplexCents).toBe(50);
  });

  it("requires sync metadata on the public pricing response", () => {
    const result = PublicPricingResponseSchema.parse({
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
        sourceLabel: "ePost daily sync",
        lastSyncedAt: "2026-04-07T06:00:00.000Z",
        freshness: "fresh",
      },
      providerBreakdown: {
        providerName: "ePost",
        note: "Reference scenario built from the latest stored provider pricing snapshot.",
        sourceUrl: "https://www.epost.ch/en/business-customers/digital-letter",
        verifiedDate: "2026-04-07",
        perPrintedPageCents: 5,
        perA4SheetCents: 10,
        envelopeC5Cents: 30,
        envelopeC4Cents: 60,
        postageCents: {
          A_POST: 110,
          B_POST: 92,
          B_POST_LARGEVOLUME: 60,
          A_PLUS: 267,
          REGISTERED: 533,
        },
        firstSheetC5Cents: {
          simplexCents: 45,
          duplexCents: 50,
        },
        additionalA4SheetCents: {
          simplexCents: 15,
          duplexCents: 20,
        },
        referenceScenario: {
          printedPages: 1,
          physicalSheets: 1,
          envelopeFormat: "C5",
          standardPostage: "A_POST",
          registeredPostage: "REGISTERED",
        },
        pricesExcludeVat: true,
        currency: "CHF",
      },
    });

    expect(result.sync.freshness).toBe("fresh");
    expect(result.sync.lastSyncedAt).toBe("2026-04-07T06:00:00.000Z");
  });

  it("rejects unsupported public pricing freshness values", () => {
    expect(() =>
      PublicPricingResponseSchema.parse({
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
          sourceLabel: "ePost daily sync",
          lastSyncedAt: "2026-04-07T06:00:00.000Z",
          freshness: "late",
        },
        providerBreakdown: {
          providerName: "ePost",
          note: "Reference scenario built from the latest stored provider pricing snapshot.",
          sourceUrl: "https://www.epost.ch/en/business-customers/digital-letter",
          verifiedDate: "2026-04-07",
          perPrintedPageCents: 5,
          perA4SheetCents: 10,
          envelopeC5Cents: 30,
          envelopeC4Cents: 60,
          postageCents: {
            A_POST: 110,
            B_POST: 92,
            B_POST_LARGEVOLUME: 60,
            A_PLUS: 267,
            REGISTERED: 533,
          },
          firstSheetC5Cents: {
            simplexCents: 45,
            duplexCents: 50,
          },
          additionalA4SheetCents: {
            simplexCents: 15,
            duplexCents: 20,
          },
          referenceScenario: {
            printedPages: 1,
            physicalSheets: 1,
            envelopeFormat: "C5",
            standardPostage: "A_POST",
            registeredPostage: "REGISTERED",
          },
          pricesExcludeVat: true,
          currency: "CHF",
        },
      }),
    ).toThrow();
  });
});
