import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculatePrice,
  formatCHF,
  getPublicPricing,
} from "../src/modules/pricing/index.js";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    PRICE_STANDARD_MARKUP_CENTS: 340,
    PRICE_REGISTERED_MARKUP_CENTS: 340,
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
  }),
}));

describe("calculatePrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds the configured markup on top of the standard reference scenario", () => {
    const result = calculatePrice("standard");
    expect(result.totalCents).toBe(495);
    expect(result.baseCents).toBe(155);
  });

  it("adds the configured markup on top of the registered reference scenario", () => {
    const result = calculatePrice("registered");
    expect(result.totalCents).toBe(918);
    expect(result.baseCents).toBe(578);
  });

  it("uses delivery surcharge for Swiss Mail markup and leaves page/attachment surcharges at zero", () => {
    const result = calculatePrice("standard");
    expect(result.deliverySurchargeCents).toBe(340);
    expect(result.pageSurchargeCents).toBe(0);
    expect(result.attachmentSurchargeCents).toBe(0);
  });

  it("total equals base + all surcharges", () => {
    const result = calculatePrice("registered");
    const sum =
      result.baseCents +
      result.deliverySurchargeCents +
      result.pageSurchargeCents +
      result.attachmentSurchargeCents;
    expect(result.totalCents).toBe(sum);
  });
});

describe("getPublicPricing", () => {
  it("returns the standard and registered totals with markup and provider references", () => {
    const result = getPublicPricing();

    expect(result.standard).toMatchObject({
      totalCents: 495,
      providerQuotedCents: 155,
      swissMailMarkupCents: 340,
      currency: "CHF",
    });
    expect(result.registered).toMatchObject({
      totalCents: 918,
      providerQuotedCents: 578,
      swissMailMarkupCents: 340,
      currency: "CHF",
    });
    expect(result.registeredSurchargeCents).toBe(423);
  });

  it("includes the verified public ePost reference inputs used on the pricing page", () => {
    const result = getPublicPricing();

    expect(result.providerBreakdown).toEqual({
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
    });
  });
});

describe("formatCHF", () => {
  it("formats 490 cents as CHF 4.90", () => {
    expect(formatCHF(490)).toBe("CHF 4.90");
  });

  it("formats 890 cents as CHF 8.90", () => {
    expect(formatCHF(890)).toBe("CHF 8.90");
  });

  it("formats 0 cents as CHF 0.00", () => {
    expect(formatCHF(0)).toBe("CHF 0.00");
  });

  it("formats 1000 cents as CHF 10.00", () => {
    expect(formatCHF(1000)).toBe("CHF 10.00");
  });

  it("formats 5 cents as CHF 0.05", () => {
    expect(formatCHF(5)).toBe("CHF 0.05");
  });
});
