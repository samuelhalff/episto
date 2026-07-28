/**
 * Regression: A4 letter page furniture — fold marks, continuation-page header,
 * page numbering. These are the three items
 * `docs/04-product/a4-template-specification.md` §4.1 recorded as specified but
 * unbuilt (items 3 and 4).
 *
 * User stories:
 * - "As a user, my printed letter has fold guides so it lands in the C5/6
 *    window envelope when folded in thirds."
 * - "As a user, a letter that runs onto a second page says who it is to and
 *    which page I am holding, in my own language."
 * - "As a user, page 1 looks exactly as it did — no header, no page number."
 */
import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { SnapshotData } from "@episto/shared";

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-font-data")),
}));

function makeSnapshotData(overrides?: Partial<SnapshotData>): SnapshotData {
  return {
    schemaVersion: 1,
    locale: "de-CH",
    deliveryType: "standard",
    subject: "Kuendigung",
    body: "Hiermit kuendige ich den Vertrag.",
    enclosureNote: null,
    signatureMode: "typed",
    tone: null,
    intent: null,
    sender: {
      firstName: "Anna",
      lastName: "Mueller",
      company: "Mueller GmbH",
      addressLine1: "Bahnhofstrasse 10",
      addressLine2: null,
      postalCode: "8001",
      city: "Zurich",
      country: "CH",
    },
    recipient: {
      firstName: "Max",
      lastName: "Weber",
      company: "Weber AG",
      department: "Rechtsdienst",
      addressLine1: "Marktgasse 5",
      addressLine2: null,
      postalCode: "3011",
      city: "Bern",
      country: "CH",
    },
    attachmentAssetIds: [],
    signatureAssetId: null,
    estimatedPages: 1,
    metadata: null,
    ...overrides,
  };
}

async function renderHtml(overrides?: Partial<SnapshotData>): Promise<string> {
  const { renderLetterHtml } =
    await import("../src/modules/rendering/render-template.js");
  return renderLetterHtml(makeSnapshotData(overrides));
}

/**
 * Builds a PDF whose pages are all one distinctive width, so that after
 * composition each page can be traced back to the render it came from without
 * needing a text extractor.
 */
async function makePdf(pageCount: number, width: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    doc.addPage([width, 800]);
  }
  return Buffer.from(await doc.save());
}

describe("regression: fold marks", () => {
  it("renders both C5/6 fold marks at 99mm and 198mm from the top", async () => {
    const html = await renderHtml();

    expect(html).toContain('<div class="fold-mark fold-mark-1"></div>');
    expect(html).toContain('<div class="fold-mark fold-mark-2"></div>');
    expect(html).toMatch(/\.fold-mark-1\s*\{\s*top:\s*99mm;/);
    expect(html).toMatch(/\.fold-mark-2\s*\{\s*top:\s*198mm;/);
  });

  it("draws the fold marks as 3mm hairlines 20mm from the left paper edge", async () => {
    const html = await renderHtml();
    const rule = html.match(/\.fold-mark\s*\{[\s\S]*?\}/);

    expect(rule).not.toBeNull();
    const foldMarkCss = rule?.[0] ?? "";
    expect(foldMarkCss).toContain("position: absolute");
    expect(foldMarkCss).toContain("left: 20mm");
    expect(foldMarkCss).toContain("width: 3mm");
    expect(foldMarkCss).toContain("border-top: 0.3pt solid #cccccc");
  });

  /**
   * The mark is a printed artefact on a page whose right-hand block has to line
   * up with an envelope window; if it ever drifts right it lands in the address
   * column or the body measure.
   */
  it("keeps the fold marks clear of the address window and the body column", async () => {
    const { LETTER_FOLD_MARKS_MM } =
      await import("../src/modules/rendering/letter-continuation.js");
    const { LETTER_LAYOUT_MM } = await import("@episto/shared");
    const markRight = LETTER_FOLD_MARKS_MM.left + LETTER_FOLD_MARKS_MM.width;

    expect(markRight).toBeLessThan(LETTER_LAYOUT_MM.body.paddingLeft);
    expect(markRight).toBeLessThan(LETTER_LAYOUT_MM.recipient.left);
    expect(LETTER_FOLD_MARKS_MM.first).toBeGreaterThan(
      LETTER_LAYOUT_MM.recipient.top + LETTER_LAYOUT_MM.recipient.minHeight,
    );
  });
});

describe("regression: continuation-page header and page numbering", () => {
  it("reserves a top band on continuation pages while leaving page 1 at margin 0", async () => {
    const html = await renderHtml();

    expect(html).toMatch(/@page\s*\{[^}]*margin:\s*20mm 0 0 0;/);
    expect(html).toMatch(/@page :first\s*\{[^}]*margin:\s*0;/);
  });

  it("does not print the continuation header or a page number on page 1", async () => {
    const html = await renderHtml();

    expect(html).not.toContain("letter-continuation-header");
    expect(html).not.toContain("pageNumber");
    expect(html).not.toContain("totalPages");
    expect(html).not.toContain("Seite 1");
  });

  it("emits the recipient, the date and a page counter in the header template", async () => {
    const { buildContinuationHeaderTemplate } =
      await import("../src/modules/rendering/letter-continuation.js");
    const { getLetterContinuationContext } =
      await import("../src/modules/rendering/render-template.js");
    const context = getLetterContinuationContext(makeSnapshotData());
    const header = buildContinuationHeaderTemplate(context);

    expect(context.recipientLine).toBe("Weber AG");
    expect(header).toContain("letter-continuation-header");
    expect(header).toContain("Weber AG");
    expect(header).toContain(context.date);
    expect(header).toContain('<span class="pageNumber"></span>');
    expect(header).toContain('<span class="totalPages"></span>');
    expect(header).toContain("font-size:8pt");
    // The address block itself must never be repeated on continuation pages.
    expect(header).not.toContain("Marktgasse 5");
    expect(header).not.toContain("3011 Bern");
  });

  it("localises the page counter for every Swiss locale", async () => {
    const { getContinuationPageLabelTemplate, buildContinuationHeaderTemplate } =
      await import("../src/modules/rendering/letter-continuation.js");

    expect(getContinuationPageLabelTemplate("de-CH")).toBe("Seite {page} von {total}");
    expect(getContinuationPageLabelTemplate("fr-CH")).toBe("Page {page} sur {total}");
    expect(getContinuationPageLabelTemplate("it-CH")).toBe("Pagina {page} di {total}");
    expect(getContinuationPageLabelTemplate("en-CH")).toBe("Page {page} of {total}");
    // Unknown locales fall back rather than printing a placeholder.
    expect(getContinuationPageLabelTemplate("rm-CH")).toBe("Page {page} of {total}");

    const german = buildContinuationHeaderTemplate({
      locale: "de-CH",
      recipientLine: "Weber AG",
      date: "28. Juli 2026",
    });
    expect(german).toContain(
      'Seite <span class="pageNumber"></span> von <span class="totalPages"></span>',
    );

    const italian = buildContinuationHeaderTemplate({
      locale: "it-CH",
      recipientLine: "Weber AG",
      date: "28 luglio 2026",
    });
    expect(italian).toContain(
      'Pagina <span class="pageNumber"></span> di <span class="totalPages"></span>',
    );
  });

  it("escapes the recipient line in the header template", async () => {
    const { buildContinuationHeaderTemplate } =
      await import("../src/modules/rendering/letter-continuation.js");
    const header = buildContinuationHeaderTemplate({
      locale: "de-CH",
      recipientLine: '<script>alert("x")</script>',
      date: "28. Juli 2026",
    });

    expect(header).not.toContain("<script>");
    expect(header).toContain("&lt;script&gt;");
  });

  it("carries the embedded letter face so the header is not set in a fallback font", async () => {
    const { buildContinuationHeaderTemplate } =
      await import("../src/modules/rendering/letter-continuation.js");
    const header = buildContinuationHeaderTemplate({
      locale: "de-CH",
      recipientLine: "Weber AG",
      date: "28. Juli 2026",
    });

    expect(header).toContain('@font-face{font-family:"Source Serif 4"');
    expect(header).toContain("data:font/woff2;base64,");
  });
});

describe("regression: page 1 is taken from the header-free render", () => {
  it("keeps page 1 from the plain pass and pages 2+ from the header pass", async () => {
    const { composeLetterWithContinuationHeader } =
      await import("../src/modules/rendering/letter-continuation.js");
    const plain = await makePdf(3, 111);
    const withHeader = await makePdf(3, 222);

    const composed = await PDFDocument.load(
      await composeLetterWithContinuationHeader(plain, withHeader),
    );

    expect(composed.getPageCount()).toBe(3);
    expect(Math.round(composed.getPage(0).getWidth())).toBe(111);
    expect(Math.round(composed.getPage(1).getWidth())).toBe(222);
    expect(Math.round(composed.getPage(2).getWidth())).toBe(222);
  });

  it("fails loudly on an unreadable render instead of returning a half-letter", async () => {
    const { composeLetterWithContinuationHeader } =
      await import("../src/modules/rendering/letter-continuation.js");

    await expect(
      composeLetterWithContinuationHeader(
        Buffer.from("not a pdf"),
        await makePdf(2, 222),
      ),
    ).rejects.toThrow();
  });
});
