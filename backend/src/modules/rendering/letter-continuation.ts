/**
 * Page furniture for the A4 letter: fold marks, and the continuation-page
 * header carried by pages 2+ ("Seite X von Y").
 *
 * Geometry follows `docs/04-product/a4-template-specification.md`:
 *  - §4 fold table: first fold 99mm, second fold 198mm from the top.
 *  - §7 "Fold mark rendering" sketch: left 20mm, width 3mm, 0.3pt #cccccc.
 *  - §6 Multi-Page Handling: "Page 2+ header ... 'Page X of Y' top-right".
 *  - §5 Type Scale: the page header (p2+) is set at 8pt.
 * The recipient/date identifier on the left of that header is not prescribed by
 * the specification (it only names the page counter); it is the conventional
 * Swiss continuation header and is added deliberately, at the same 8pt.
 *
 * Why the header is a Puppeteer header template rather than markup inside the
 * letter HTML: Chromium is the only part of this pipeline that knows which page
 * a fragment landed on. A `position: fixed` element repeats identically on every
 * page (so it cannot count), and an absolutely positioned element cannot paint
 * into a page's margin band (so it would overlap body text). The header template
 * is the one mechanism that both reserves space and exposes `pageNumber` /
 * `totalPages`. Its one limitation is that Chromium prints it on page 1 as well,
 * which is why page 1 is taken from a separate, header-free render — see
 * `composeLetterWithContinuationHeader`.
 */
import { PDFDocument } from "pdf-lib";
import { EMBEDDED_FONTS_CSS } from "./fonts.css.js";
import { escapeHtml } from "./letter-document-html.js";
import type { PdfRenderMargins } from "./render.types.js";

export type LetterLocale = "de-CH" | "fr-CH" | "it-CH" | "en-CH";

/** Fold marks — a4-template-specification.md §4 and §7. */
export const LETTER_FOLD_MARKS_MM = {
  left: 20,
  width: 3,
  first: 99,
  second: 198,
} as const;

export const LETTER_FOLD_MARK_STROKE = "0.3pt";
export const LETTER_FOLD_MARK_COLOR = "#cccccc";

/**
 * Top band reserved on continuation pages for the header. Page 1 keeps
 * `margin: 0` (`@page :first`), so its geometry — including the envelope-window
 * address block — is untouched.
 */
export const LETTER_CONTINUATION_MM = {
  topMargin: 20,
  paddingLeft: 25,
  paddingRight: 20,
} as const;

export const LETTER_CONTINUATION_PT = 8;
export const LETTER_CONTINUATION_COLOR = "#666666";

/**
 * Print margins for the letter. The letter HTML sets its own `@page` margins
 * (0 on page 1, a top band on continuation pages) and those win for layout;
 * these must agree with them so Chromium draws the header template inside the
 * same band it reserved.
 */
export const LETTER_PDF_MARGINS: PdfRenderMargins = {
  top: `${LETTER_CONTINUATION_MM.topMargin}mm`,
  right: "0mm",
  bottom: "0mm",
  left: "0mm",
};

/**
 * `{page}` / `{total}` are replaced with Chromium's `pageNumber` / `totalPages`
 * spans, which it fills in per page. Kept as templates rather than concatenated
 * fragments so word order stays translatable.
 */
const PAGE_LABEL_TEMPLATE: Record<LetterLocale, string> = {
  "de-CH": "Seite {page} von {total}",
  "fr-CH": "Page {page} sur {total}",
  "it-CH": "Pagina {page} di {total}",
  "en-CH": "Page {page} of {total}",
};

export function getContinuationPageLabelTemplate(locale: string): string {
  return PAGE_LABEL_TEMPLATE[locale as LetterLocale] ?? PAGE_LABEL_TEMPLATE["en-CH"];
}

function renderPageLabelHtml(locale: string): string {
  return escapeHtml(getContinuationPageLabelTemplate(locale))
    .replace("{page}", '<span class="pageNumber"></span>')
    .replace("{total}", '<span class="totalPages"></span>');
}

export interface ContinuationHeaderContext {
  locale: string;
  /** Recipient identifier — first line of the address block (company or name). */
  recipientLine: string;
  /** Letter date, already formatted for the locale. */
  date: string;
}

/**
 * Chromium header template. It is a standalone document, so the letter face has
 * to travel with it; without the embedded @font-face the header would print in
 * the renderer's default font while the letter prints in Source Serif 4.
 */
export function buildContinuationHeaderTemplate(
  context: ContinuationHeaderContext,
): string {
  const identity = [context.recipientLine, context.date]
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => escapeHtml(part))
    .join(" &middot; ");

  return `<style>${EMBEDDED_FONTS_CSS}</style>
<div class="letter-continuation-header" style="box-sizing:border-box;width:100%;padding:6mm ${LETTER_CONTINUATION_MM.paddingRight}mm 0 ${LETTER_CONTINUATION_MM.paddingLeft}mm;font-family:'Source Serif 4',Georgia,'Times New Roman',serif;font-size:${LETTER_CONTINUATION_PT}pt;color:${LETTER_CONTINUATION_COLOR};">
  <span style="float:left;">${identity}</span>
  <span style="float:right;">${renderPageLabelHtml(context.locale)}</span>
</div>`;
}

/**
 * Page 1 comes from the header-free render, pages 2+ from the render that
 * carries the continuation header. Both renders use identical HTML and page
 * margins, so they paginate identically; only the header overlay differs.
 */
export async function composeLetterWithContinuationHeader(
  firstPagePdf: Buffer,
  continuationPdf: Buffer,
): Promise<Buffer> {
  const source = await PDFDocument.load(firstPagePdf);
  const target = await PDFDocument.load(continuationPdf);

  if (source.getPageCount() < 1 || target.getPageCount() < 1) {
    throw new Error("Cannot compose a letter PDF from an empty render");
  }

  const [plainFirstPage] = await target.copyPages(source, [0]);
  if (!plainFirstPage) {
    throw new Error("Failed to copy the header-free first page");
  }

  target.removePage(0);
  target.insertPage(0, plainFirstPage);

  return Buffer.from(await target.save());
}
