/**
 * PDF rendering pipeline.
 *
 * Uses Puppeteer to convert HTML letter content to PDF.
 *
 * Pipeline:
 * 1. Load snapshot data (letter content, addresses, metadata)
 * 2. Render HTML from template + snapshot
 * 3. Generate PDF via Puppeteer (A4 format)
 * 4. Upload to object storage
 * 5. Create file_asset record
 * 6. Link PDF to snapshot
 */

import { readFileSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { getDb } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { createFileAsset, renderStorageKey } from "../files/file.service.js";
import { uploadObject } from "../files/adapters/s3.adapter.js";
import { setSnapshotPdfAsset } from "./snapshot.service.js";
import { loadSignatureImageBase64 } from "./signature-image.js";
import { AppError } from "../../shared/errors/index.js";
import { createLogger } from "../../shared/logging/index.js";
import {
  extractAiDocumentMetadata,
  flattenDocumentModel,
  getLetterFraming,
  LETTER_COLORS,
  LETTER_LAYOUT_MM,
  LETTER_LAYOUT_PT,
  LETTER_PAGE_MM,
  SnapshotDataSchema,
  type DocumentModel,
  type DocumentBlock,
  type InlineSpan,
  type ListItem,
  type SnapshotData,
} from "@swiss-mail/shared";
import { stripLetterFramingDocument } from "@swiss-mail/shared/letter-framing";
import { getPuppeteerLaunchOptions } from "./browser-launch.js";

const logger = createLogger("render-service");

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface RenderResult {
  pdfAssetId: string;
  storageKey: string;
  sizeBytes: number;
  pageCount: number;
}

export interface PdfRenderMargins {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface RenderPdfBufferResult {
  pdfBuffer: Buffer;
  pageCount: number;
}

let signatureFontFaceCss: string | null = null;

// ---------------------------------------------------------------------------
// Browser management — lazy singleton
// ---------------------------------------------------------------------------

let _browser: Browser | undefined;

async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser;

  _browser = await puppeteer.launch(getPuppeteerLaunchOptions());
  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = undefined;
  }
}

function parseSnapshotData(
  snapshotId: string,
  draftId: string,
  snapshotData: unknown,
): SnapshotData {
  const parsed = SnapshotDataSchema.safeParse(snapshotData);
  if (parsed.success) {
    return parsed.data;
  }

  logger.error(
    {
      snapshotId,
      draftId,
      issues: parsed.error.issues,
    },
    "Snapshot data failed validation before PDF render",
  );

  throw new AppError({
    family: "rendering_failure",
    statusCode: 500,
    code: "SNAPSHOT_DATA_INVALID",
    message: `Snapshot ${snapshotId} contains invalid data`,
    userMessage: "This draft snapshot is invalid and could not be rendered.",
    userAction: "Refresh the preview and try again.",
    fields: parsed.error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join(".") : "snapshotData",
      message: issue.message,
    })),
    cause: parsed.error,
  });
}

function getSignatureFontFaceCss(): string {
  if (signatureFontFaceCss) {
    return signatureFontFaceCss;
  }

  const fontPath = new URL(
    "../../../../frontend/public/fonts/allura/Allura-Regular.ttf",
    import.meta.url,
  );
  const fontBase64 = readFileSync(fontPath).toString("base64");

  signatureFontFaceCss = `@font-face {
      font-family: "Allura Signature";
      src: url(data:font/ttf;base64,${fontBase64}) format("truetype");
      font-display: swap;
    }`;

  return signatureFontFaceCss;
}

function getSenderSignatureName(sender: SnapshotData["sender"]): string {
  return [sender.firstName, sender.lastName].filter(Boolean).join(" ").trim();
}

function getAddressBlockLines(
  address: SnapshotData["sender"] | SnapshotData["recipient"] | null | undefined,
  role: "sender" | "recipient",
): string[] {
  if (!address) {
    return [];
  }

  const lines: string[] = [];
  const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ").trim();

  if (role === "recipient") {
    if (address.company) {
      lines.push(address.company);
    }
    if ("department" in address && address.department) {
      lines.push(address.department);
    }
    if (fullName) {
      lines.push(fullName);
    }
  } else {
    if (fullName) {
      lines.push(fullName);
    }
    if (address.company) {
      lines.push(address.company);
    }
  }

  lines.push(address.addressLine1);

  if (address.addressLine2) {
    lines.push(address.addressLine2);
  }

  lines.push(`${address.postalCode} ${address.city}`);

  if (address.country && address.country !== "CH") {
    lines.push(address.country);
  }

  return lines;
}

function renderAddressBlockHtml(lines: string[]): string {
  return lines.map((line) => escapeHtml(line)).join("<br>");
}

function getDeliveryTypeDisplay(
  locale: SnapshotData["locale"],
  deliveryType: SnapshotData["deliveryType"],
): string {
  switch (locale) {
    case "de-CH":
      return deliveryType === "registered" ? "Einschreiben" : "A-Post";
    case "fr-CH":
      return deliveryType === "registered" ? "Recommande" : "Courrier Standard";
    case "it-CH":
      return deliveryType === "registered" ? "Raccomandata" : "Posta Standard";
    case "en-CH":
    default:
      return deliveryType === "registered" ? "Registered Mail" : "Standard Mail";
  }
}

// ---------------------------------------------------------------------------
// HTML letter template (Swiss DIN 5008 / SN 010 130 inspired)
// ---------------------------------------------------------------------------

export interface RenderLetterHtmlOptions {
  signatureImageBase64?: string | null;
}

export function renderLetterHtml(
  data: SnapshotData,
  options?: RenderLetterHtmlOptions,
): string {
  const sender = data.sender;
  const recipient = data.recipient;
  const formattedDate = new Date().toLocaleDateString(data.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const placeAndDate = sender?.city?.trim()
    ? `${sender.city.trim()}, ${formattedDate}`
    : formattedDate;
  const document = stripLetterFramingDocument(
    extractAiDocumentMetadata(data.metadata)?.document ??
      fallbackDocument(data.body ?? ""),
    data.locale,
  );
  const hasLetterContent = flattenDocumentModel(document).trim().length > 0;
  const { salutation, closing } = getLetterFraming(data.locale);
  const signatureName = getSenderSignatureName(sender);

  let signatureBlock = "";
  if (data.signatureMode === "drawn" && options?.signatureImageBase64) {
    signatureBlock = `<div class="signature-block">
  <img class="signature-image" src="data:image/png;base64,${options.signatureImageBase64}" alt="Signature" />
  <div class="signature-name">${escapeHtml(signatureName)}</div>
</div>`;
  } else if (data.signatureMode === "typed" && signatureName) {
    signatureBlock = `<div class="signature-block">
  <div class="signature-script">${escapeHtml(signatureName)}</div>
  <div class="signature-name">${escapeHtml(signatureName)}</div>
</div>`;
  }
  const senderBlock = renderAddressBlockHtml(getAddressBlockLines(sender, "sender"));
  const recipientBlock = renderAddressBlockHtml(
    getAddressBlockLines(recipient, "recipient"),
  );
  const deliveryLine = getDeliveryTypeDisplay(
    data.locale,
    data.deliveryType,
  ).toUpperCase();

  return `<!DOCTYPE html>
<html lang="${escapeHtml(data.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    ${getSignatureFontFaceCss()}
    @page {
      size: A4;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: ${LETTER_COLORS.text};
      -webkit-font-smoothing: antialiased;
      background: #ffffff;
    }
    .letter-layout-shell {
      position: relative;
      width: ${LETTER_PAGE_MM.width}mm;
      min-height: ${LETTER_PAGE_MM.height}mm;
      background: #ffffff;
    }
    .sender-block,
    .dispatch-line,
    .recipient-block,
    .right-meta {
      position: absolute;
      text-align: left;
    }
    .sender-block {
      top: ${LETTER_LAYOUT_MM.sender.top}mm;
      left: ${LETTER_LAYOUT_MM.sender.left}mm;
      width: ${LETTER_LAYOUT_MM.sender.width}mm;
      font-size: ${LETTER_LAYOUT_PT.sender}pt;
      line-height: 1.45;
      color: ${LETTER_COLORS.text};
    }
    .dispatch-line {
      top: ${LETTER_LAYOUT_MM.dispatch.top}mm;
      left: ${LETTER_LAYOUT_MM.dispatch.left}mm;
      width: ${LETTER_LAYOUT_MM.dispatch.width}mm;
      font-size: ${LETTER_LAYOUT_PT.dispatch}pt;
      line-height: 1.2;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-decoration: underline;
      text-underline-offset: 2px;
      color: ${LETTER_COLORS.text};
    }
    .recipient-block {
      top: ${LETTER_LAYOUT_MM.recipient.top}mm;
      left: ${LETTER_LAYOUT_MM.recipient.left}mm;
      width: ${LETTER_LAYOUT_MM.recipient.width}mm;
      min-height: ${LETTER_LAYOUT_MM.recipient.minHeight}mm;
      font-size: ${LETTER_LAYOUT_PT.recipient}pt;
      line-height: 1.35;
      color: ${LETTER_COLORS.text};
    }
    .right-meta {
      top: ${LETTER_LAYOUT_MM.rightMeta.top}mm;
      left: ${LETTER_LAYOUT_MM.rightMeta.left}mm;
      width: ${LETTER_LAYOUT_MM.rightMeta.width}mm;
    }
    .date-line {
      font-size: ${LETTER_LAYOUT_PT.date}pt;
      color: ${LETTER_COLORS.date};
    }
    .body-flow {
      padding: ${LETTER_LAYOUT_MM.body.paddingTop}mm ${LETTER_LAYOUT_MM.body.paddingRight}mm ${LETTER_LAYOUT_MM.body.paddingBottom}mm ${LETTER_LAYOUT_MM.body.paddingLeft}mm;
      font-size: ${LETTER_LAYOUT_PT.body}pt;
      line-height: 1.55;
      color: ${LETTER_COLORS.text};
    }
    .subject-line {
      font-weight: 700;
      font-size: ${LETTER_LAYOUT_PT.subject}pt;
      letter-spacing: -0.01em;
      margin-bottom: ${LETTER_LAYOUT_MM.subject.marginBottom}mm;
    }
    .salutation-line {
      margin-bottom: ${LETTER_LAYOUT_MM.salutation.marginBottom}mm;
    }
    .letter-body {
      margin-bottom: ${LETTER_LAYOUT_MM.letterBody.marginBottom}mm;
    }
    .closing-line {
      margin-top: ${LETTER_LAYOUT_MM.closing.marginTop}mm;
    }
    .signature-block {
      margin-top: ${LETTER_LAYOUT_MM.signature.marginTop}mm;
      page-break-inside: avoid;
    }
    .signature-script {
      display: inline-block;
      font-family: "Allura Signature", "Snell Roundhand", "Brush Script MT", cursive;
      font-size: ${LETTER_LAYOUT_PT.signatureScript}pt;
      letter-spacing: 0.01em;
      line-height: 0.9;
      color: ${LETTER_COLORS.signatureScript};
      transform: rotate(-1.5deg);
      transform-origin: left center;
    }
    .signature-image {
      max-height: 18mm;
      max-width: 60mm;
      object-fit: contain;
    }
    .signature-name {
      margin-top: ${LETTER_LAYOUT_MM.signatureName.marginTop}mm;
      font-size: ${LETTER_LAYOUT_PT.signatureName}pt;
      letter-spacing: 0.02em;
      color: ${LETTER_COLORS.signatureName};
    }
    .letter-paragraph {
      margin: 0 0 4mm 0;
      white-space: pre-wrap;
    }
    .letter-heading-1 {
      font-size: ${LETTER_LAYOUT_PT.heading1}pt;
      font-weight: 700;
      margin: 2mm 0 4mm 0;
    }
    .letter-heading-2 {
      font-size: ${LETTER_LAYOUT_PT.heading2}pt;
      font-weight: 700;
      margin: 2mm 0 3mm 0;
    }
    .letter-heading-3 {
      font-size: ${LETTER_LAYOUT_PT.heading3}pt;
      font-weight: 700;
      margin: 1mm 0 2mm 0;
    }
    .letter-list {
      margin: 0 0 4mm 20px;
      padding: 0;
    }
    .letter-list li {
      margin-bottom: 1.5mm;
    }
    .letter-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 5mm 0;
      font-size: ${LETTER_LAYOUT_PT.table}pt;
    }
    .letter-table th,
    .letter-table td {
      border: 1px solid ${LETTER_COLORS.tableBorder};
      padding: 5px 7px;
      vertical-align: top;
    }
    .letter-table th {
      background: ${LETTER_COLORS.tableHeaderBg};
      text-align: left;
      font-weight: 600;
    }
    .enclosure-note {
      font-size: ${LETTER_LAYOUT_PT.sender}pt;
      color: ${LETTER_COLORS.enclosure};
      margin-top: ${LETTER_LAYOUT_MM.enclosure.marginTop}mm;
      padding-top: ${LETTER_LAYOUT_MM.enclosure.paddingTop}mm;
      border-top: 0.5px solid ${LETTER_COLORS.enclosureBorder};
      font-style: italic;
    }
  </style>
</head>
<body>
  <main class="letter-layout-shell">
    ${senderBlock ? `<div class="sender-block">${senderBlock}</div>` : ""}
    <div class="dispatch-line">${escapeHtml(deliveryLine)}</div>
    <div class="recipient-block">${recipientBlock}</div>
    <div class="right-meta">
      <div class="date-line">${escapeHtml(placeAndDate)}</div>
    </div>
    <div class="body-flow">
      ${data.subject ? `<div class="subject-line">${escapeHtml(data.subject)}</div>` : ""}
      ${hasLetterContent ? `<div class="salutation-line">${escapeHtml(salutation)}</div>` : ""}
      <div class="letter-body">${renderDocumentHtml(document)}</div>
      ${hasLetterContent ? `<div class="closing-line">${escapeHtml(closing)}</div>` : ""}
      ${signatureBlock}
      ${data.enclosureNote ? `<div class="enclosure-note">${escapeHtml(data.enclosureNote)}</div>` : ""}
    </div>
  </main>
</body>
</html>`;
}

function renderDocumentHtml(document: DocumentModel): string {
  return document.blocks.map(renderBlockHtml).join("\n");
}

function renderBlockHtml(block: DocumentBlock): string {
  if (block.type === "paragraph") {
    const tag = paragraphTag(block.style);
    const className = paragraphClassName(block.style);
    const style = renderParagraphStyle(
      block.alignment,
      block.spacingBefore,
      block.spacingAfter,
      block.indentation,
    );
    return `<${tag} class="${className}"${style ? ` style="${style}"` : ""}>${renderInlineText(block.text, block.spans ?? [])}</${tag}>`;
  }

  if (block.type === "list") {
    const tag = block.listType === "numbered" ? "ol" : "ul";
    return `<${tag} class="letter-list">${renderListItemsHtml(block.items)}</${tag}>`;
  }

  const headerHtml = block.headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const rowsHtml = block.rows
    .map(
      (row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table class="letter-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

function renderListItemsHtml(items: ListItem[]): string {
  return items
    .map((item) => {
      const nested = item.children?.length
        ? `<ul class="letter-list">${renderListItemsHtml(item.children)}</ul>`
        : "";
      return `<li>${renderInlineText(item.text, item.spans ?? [])}${nested}</li>`;
    })
    .join("");
}

function renderInlineText(text: string, spans: InlineSpan[]): string {
  if (spans.length === 0) {
    return escapeHtml(text);
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  let cursor = 0;
  const segments: string[] = [];

  for (const span of sorted) {
    if (span.start > cursor) {
      segments.push(escapeHtml(text.slice(cursor, span.start)));
    }

    const content = escapeHtml(text.slice(span.start, span.end));
    const wrappers: string[] = [];
    if (span.bold) wrappers.push("strong");
    if (span.italic) wrappers.push("em");
    if (span.underline) wrappers.push("u");

    let wrapped = content;
    for (const wrapper of wrappers) {
      wrapped = `<${wrapper}>${wrapped}</${wrapper}>`;
    }
    segments.push(wrapped);
    cursor = span.end;
  }

  if (cursor < text.length) {
    segments.push(escapeHtml(text.slice(cursor)));
  }

  return segments.join("");
}

function paragraphTag(style: string): string {
  if (style === "Heading 1") return "h1";
  if (style === "Heading 2") return "h2";
  if (style === "Heading 3") return "h3";
  return "p";
}

function paragraphClassName(style: string): string {
  if (style === "Heading 1") return "letter-heading-1";
  if (style === "Heading 2") return "letter-heading-2";
  if (style === "Heading 3") return "letter-heading-3";
  return "letter-paragraph";
}

function renderParagraphStyle(
  alignment?: string,
  spacingBefore?: number,
  spacingAfter?: number,
  indentation?: number,
): string {
  const styles: string[] = [];
  if (alignment) styles.push(`text-align:${alignment}`);
  if (spacingBefore) styles.push(`margin-top:${spacingBefore}pt`);
  if (spacingAfter) styles.push(`margin-bottom:${spacingAfter}pt`);
  if (indentation) styles.push(`padding-left:${indentation}pt`);
  return styles.join(";");
}

function fallbackDocument(body: string): DocumentModel {
  return {
    version: "1.0",
    blocks: [
      {
        type: "paragraph",
        text: body,
        style: "Normal",
      },
    ],
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function countPdfPages(pdfBuffer: Buffer | Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(pdfBuffer);
  return pdf.getPageCount();
}

export async function renderPdfBufferFromHtml(
  html: string,
  options?: {
    margins?: PdfRenderMargins;
  },
): Promise<RenderPdfBufferResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const margins = options?.margins ?? {
    top: "25mm",
    right: "25mm",
    bottom: "30mm",
    left: "25mm",
  };

  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      const browserGlobal = globalThis as {
        document?: { fonts?: { ready?: Promise<unknown> } };
      };
      await (browserGlobal.document?.fonts?.ready ?? Promise.resolve());
    });

    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        margin: margins,
      }),
    );

    return {
      pdfBuffer,
      pageCount: await countPdfPages(pdfBuffer),
    };
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export async function renderSnapshotToPdf(snapshotId: string): Promise<RenderResult> {
  const db = getDb();

  // 1. Load snapshot
  const [snapshot] = await db
    .select()
    .from(schema.draftSnapshots)
    .where(eq(schema.draftSnapshots.id, snapshotId))
    .limit(1);

  if (!snapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const snapshotData = parseSnapshotData(
    snapshot.id,
    snapshot.draftId,
    snapshot.snapshotData,
  );

  // 2. Load drawn signature image if needed
  const signatureImageBase64 = await loadSignatureImageBase64(db, snapshotData);

  // 3. Render HTML
  const html = renderLetterHtml(snapshotData, { signatureImageBase64 });

  // 4. Generate PDF via Puppeteer
  const { pdfBuffer, pageCount } = await renderPdfBufferFromHtml(html);

  // 4. Upload to storage
  const storageKey = renderStorageKey(snapshot.draftId, snapshot.version);
  await uploadObject(storageKey, pdfBuffer, "application/pdf");

  // 5. Get session ID for file asset
  const [draft] = await db
    .select({ sessionId: schema.draftLetters.sessionId })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, snapshot.draftId))
    .limit(1);

  if (!draft) {
    throw new Error(`Draft not found: ${snapshot.draftId}`);
  }

  const fileAsset = await createFileAsset(db, {
    sessionId: draft.sessionId,
    draftId: snapshot.draftId,
    kind: "rendered_pdf",
    storageKey,
    originalFilename: `letter-v${snapshot.version}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: pdfBuffer.byteLength,
  });

  // 6. Link PDF to snapshot
  await setSnapshotPdfAsset(db, snapshotId, fileAsset.id, pageCount);

  logger.info(
    {
      snapshotId,
      draftId: snapshot.draftId,
      version: snapshot.version,
      pageCount,
      sizeBytes: pdfBuffer.byteLength,
    },
    "PDF rendered successfully",
  );

  return {
    pdfAssetId: fileAsset.id,
    storageKey,
    sizeBytes: pdfBuffer.byteLength,
    pageCount,
  };
}
