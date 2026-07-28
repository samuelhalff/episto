import { createHash } from "node:crypto";
import type { FastifyReply } from "fastify";
import { desc, eq, inArray } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  buildOrderReference,
  extractAiDocumentMetadata,
  flattenDocumentModel,
  type SnapshotData,
} from "@episto/shared";
import {
  documentFromPlainText,
  stripLetterFramingDocument,
} from "@episto/shared/letter-framing";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import { env } from "../../shared/config/index.js";
import { isMockEpostProviderName } from "../dispatch/adapters/epost-submission-mode.js";
import { BRAND_NAME } from "../../shared/brand.js";
import { downloadObjectBuffer } from "../files/adapters/s3.adapter.js";
import { renderConfirmationDocumentHtml } from "./confirmation-document.js";
import { renderLetterHtml, renderPdfBufferFromHtml } from "./render.service.js";
import { loadSignatureImageAsset } from "./signature-image.js";
import { getLatestSnapshot, type SnapshotRow } from "./snapshot.service.js";
import { parseStoredSnapshotData } from "./snapshot-data.js";

interface RenderedLetterSource {
  snapshot: SnapshotRow;
  snapshotData: SnapshotData;
}

const CONFIRMATION_CONTENT_SUMMARY_MAX_LENGTH = 160;

function buildContentSummary(snapshotData: SnapshotData): string {
  const document = stripLetterFramingDocument(
    extractAiDocumentMetadata(snapshotData.metadata)?.document ??
      documentFromPlainText(snapshotData.body),
    snapshotData.locale,
  );
  const flattened = flattenDocumentModel(document).replace(/\s+/g, " ").trim();

  if (!flattened) {
    return "";
  }

  if (flattened.length <= CONFIRMATION_CONTENT_SUMMARY_MAX_LENGTH) {
    return flattened;
  }

  return `${flattened.slice(0, CONFIRMATION_CONTENT_SUMMARY_MAX_LENGTH - 3).trimEnd()}...`;
}

async function getRenderedLetterAsset(
  db: Db,
  draftId: string,
): Promise<RenderedLetterSource> {
  const snapshot = await getLatestSnapshot(db, draftId);
  if (!snapshot) {
    throw new AppError({
      family: "rendering_failure",
      statusCode: 404,
      code: "PDF_NOT_READY",
      message: "No rendered confirmation document is available for this draft.",
      userMessage: "Your confirmation document is not ready yet.",
      userAction: "Please try again in a few moments.",
    });
  }

  const snapshotData = parseStoredSnapshotData(snapshot.snapshotData);

  return {
    snapshot,
    snapshotData,
  };
}

interface AttachmentAsset {
  id: string;
  name: string;
  storageKey: string;
  mimeType: string;
}

// A4 dimensions in PostScript points (1pt = 1/72in). Used when rasterised
// image attachments are placed one-per-page in the justificatif bundle.
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
// ~20mm margins (20mm ≈ 56.69pt) so embedded images never bleed to the edge.
const IMAGE_PAGE_MARGIN_PT = 56.69;

/**
 * Load attachment file assets in the caller-provided order, resolving a
 * display name for each. Ordering is preserved because the bundle must
 * reproduce enclosures in the same order they were attached.
 */
async function getAttachmentAssets(
  db: Db,
  assetIds: string[],
): Promise<AttachmentAsset[]> {
  if (assetIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: schema.fileAssets.id,
      originalFilename: schema.fileAssets.originalFilename,
      storageKey: schema.fileAssets.storageKey,
      mimeType: schema.fileAssets.mimeType,
    })
    .from(schema.fileAssets)
    .where(inArray(schema.fileAssets.id, assetIds));

  const byId = new Map(rows.map((row) => [row.id, row]));

  return assetIds.flatMap((assetId) => {
    const row = byId.get(assetId);
    if (!row) {
      return [];
    }

    return [
      {
        id: row.id,
        name: row.originalFilename ?? row.storageKey.split("/").pop() ?? assetId,
        storageKey: row.storageKey,
        mimeType: row.mimeType,
      },
    ];
  });
}

/** Hex SHA-256 fingerprint of the exact bytes handed to Swiss Post. */
export function sha256Hex(bytes: Buffer | Uint8Array): string {
  return createHash("sha256")
    .update(bytes instanceof Buffer ? bytes : Buffer.from(bytes))
    .digest("hex");
}

/**
 * Append an attachment to the bundle and return how many pages it contributed.
 * - PDF attachments: every page is copied verbatim.
 * - Image attachments (png/jpeg): embedded on a single centred A4 page,
 *   scaled to fit within the margins while preserving aspect ratio.
 * Unknown mime types are skipped defensively (0 pages).
 */
async function appendAttachmentToBundle(
  bundle: PDFDocument,
  attachment: AttachmentAsset,
  bytes: Buffer,
): Promise<number> {
  if (attachment.mimeType === "application/pdf") {
    const source = await PDFDocument.load(bytes);
    const pageIndexes = source.getPageIndices();
    const pages = await bundle.copyPages(source, pageIndexes);
    pages.forEach((page) => bundle.addPage(page));
    return pages.length;
  }

  if (attachment.mimeType === "image/png" || attachment.mimeType === "image/jpeg") {
    const image =
      attachment.mimeType === "image/png"
        ? await bundle.embedPng(bytes)
        : await bundle.embedJpg(bytes);

    const page = bundle.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    const maxWidth = A4_WIDTH_PT - IMAGE_PAGE_MARGIN_PT * 2;
    const maxHeight = A4_HEIGHT_PT - IMAGE_PAGE_MARGIN_PT * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    page.drawImage(image, {
      x: (A4_WIDTH_PT - drawWidth) / 2,
      y: (A4_HEIGHT_PT - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });

    return 1;
  }

  return 0;
}

/** Localized middle label for the per-page bundle footer. */
const BUNDLE_FOOTER_LABEL: Record<string, string> = {
  "en-CH": "Dispatch statement",
  "de-CH": "Versandnachweis",
  "fr-CH": "Justificatif d'envoi",
  "it-CH": "Attestazione di spedizione",
};

/**
 * Stamp every page of the assembled bundle with a small grey footer
 * `{orderRef} · {label} · Page {i} de {N}` so all pages read as one
 * instrument. Positioned bottom-centre with a ~24pt margin.
 */
async function stampBundleFooter(
  bundle: PDFDocument,
  orderRef: string,
  locale: string,
): Promise<void> {
  const font = await bundle.embedFont(StandardFonts.Helvetica);
  const label = BUNDLE_FOOTER_LABEL[locale] ?? BUNDLE_FOOTER_LABEL["en-CH"];
  const pageWord: Record<string, string> = {
    "en-CH": "of",
    "de-CH": "von",
    "fr-CH": "de",
    "it-CH": "di",
  };
  const connector = pageWord[locale] ?? pageWord["en-CH"];
  const size = 8;
  const color = rgb(0.5, 0.5, 0.5);
  const margin = 24;
  const pages = bundle.getPages();
  const total = pages.length;

  pages.forEach((page, index) => {
    const text = `${orderRef} · ${label} · Page ${index + 1} ${connector} ${total}`;
    const width = font.widthOfTextAtSize(text, size);
    const { width: pageWidth } = page.getSize();
    page.drawText(text, {
      x: (pageWidth - width) / 2,
      y: margin,
      size,
      font,
      color,
    });
  });
}

async function buildConfirmationBundlePdf(db: Db, draftId: string): Promise<Buffer> {
  const config = env();
  const renderedLetter = await getRenderedLetterAsset(db, draftId);
  const signatureImage = await loadSignatureImageAsset(
    db,
    renderedLetter.snapshotData,
    draftId,
  );
  const [[dispatch], attachmentAssets] = await Promise.all([
    db
      .select({
        state: schema.dispatchAttempts.state,
        providerName: schema.dispatchAttempts.providerName,
        providerReference: schema.dispatchAttempts.providerReference,
        trackingNumber: schema.dispatchAttempts.trackingNumber,
        submittedAt: schema.dispatchAttempts.submittedAt,
        createdAt: schema.dispatchAttempts.createdAt,
      })
      .from(schema.dispatchAttempts)
      .where(eq(schema.dispatchAttempts.draftId, draftId))
      .orderBy(desc(schema.dispatchAttempts.createdAt))
      .limit(1),
    getAttachmentAssets(db, renderedLetter.snapshotData.attachmentAssetIds),
  ]);

  const letterHtml = renderLetterHtml(renderedLetter.snapshotData, {
    signatureImage,
  });
  const renderedLetterPdf = await renderPdfBufferFromHtml(letterHtml);

  // Tamper-evidence fingerprint of the exact letter bytes we reproduce below.
  const letterSha256 = sha256Hex(renderedLetterPdf.pdfBuffer);
  const letterPageCount = renderedLetterPdf.pageCount;

  // Build the content bundle (letter + enclosures) first so we can measure the
  // per-enclosure page counts and fingerprints that the statement will attest.
  const contentBundle = await PDFDocument.create();
  const letterSource = await PDFDocument.load(renderedLetterPdf.pdfBuffer);
  const letterPages = await contentBundle.copyPages(
    letterSource,
    letterSource.getPageIndices(),
  );
  letterPages.forEach((page) => contentBundle.addPage(page));

  const enclosures: Array<{ name: string; pageCount: number; sha256: string }> = [];
  for (const attachment of attachmentAssets) {
    const { buffer } = await downloadObjectBuffer(attachment.storageKey);
    const pageCount = await appendAttachmentToBundle(contentBundle, attachment, buffer);
    enclosures.push({
      name: attachment.name,
      pageCount,
      sha256: sha256Hex(buffer),
    });
  }

  const totalContentPages =
    letterPageCount + enclosures.reduce((sum, e) => sum + e.pageCount, 0);

  const providerMode: "mock" | "live" | null = dispatch
    ? isMockEpostProviderName(dispatch.providerName)
      ? "mock"
      : "live"
    : null;
  const confirmationHtml = renderConfirmationDocumentHtml({
    orderRef: buildOrderReference(draftId),
    locale: renderedLetter.snapshotData.locale,
    submittedAt:
      dispatch?.submittedAt ?? dispatch?.createdAt ?? renderedLetter.snapshot.createdAt,
    dispatchState: dispatch?.state ?? "queued",
    deliveryType: renderedLetter.snapshotData.deliveryType,
    providerMode,
    providerReference: dispatch?.providerReference ?? null,
    trackingNumber: dispatch?.trackingNumber ?? null,
    pageCount: letterPageCount,
    letterPageCount,
    totalContentPages,
    letterSha256,
    enclosures: enclosures.map((e) => ({ name: e.name, pageCount: e.pageCount })),
    enclosureHashes: enclosures.map((e) => ({ name: e.name, sha256: e.sha256 })),
    attachmentNames: enclosures.map((e) => e.name),
    sender: renderedLetter.snapshotData.sender,
    recipient: renderedLetter.snapshotData.recipient,
    subject: renderedLetter.snapshotData.subject ?? null,
    contentSummary: buildContentSummary(renderedLetter.snapshotData),
    issuer: {
      name: config.LEGAL_ENTITY_NAME,
      addressLine1: config.LEGAL_ENTITY_ADDRESS_LINE_1,
      addressLine2: config.LEGAL_ENTITY_ADDRESS_LINE_2,
      country: config.LEGAL_ENTITY_COUNTRY,
      uidVat: config.LEGAL_ENTITY_UID_VAT,
      supportEmail: config.SUPPORT_EMAIL,
    },
  });

  const { pdfBuffer: confirmationFrontPage } = await renderPdfBufferFromHtml(
    confirmationHtml,
    {
      margins: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    },
  );

  // Final order: [statement, letter, enclosure1, enclosure2, …].
  const bundle = await PDFDocument.create();
  const statementSource = await PDFDocument.load(confirmationFrontPage);
  const statementPages = await bundle.copyPages(
    statementSource,
    statementSource.getPageIndices(),
  );
  statementPages.forEach((page) => bundle.addPage(page));

  const contentBytes = await contentBundle.save();
  const contentSource = await PDFDocument.load(contentBytes);
  const contentPages = await bundle.copyPages(
    contentSource,
    contentSource.getPageIndices(),
  );
  contentPages.forEach((page) => bundle.addPage(page));

  // Bind all pages together as one instrument: stamp orderRef + page X of N
  // on every page of the final merged bundle.
  await stampBundleFooter(
    bundle,
    buildOrderReference(draftId),
    renderedLetter.snapshotData.locale,
  );

  return Buffer.from(await bundle.save());
}

export async function sendRenderedDraftPdf(
  db: Db,
  draftId: string,
  reply: FastifyReply,
): Promise<void> {
  const pdfBuffer = await buildConfirmationBundlePdf(db, draftId);

  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Length", String(pdfBuffer.byteLength));
  reply.header(
    "Content-Disposition",
    `attachment; filename="${BRAND_NAME.toLowerCase()}-${draftId.slice(0, 8)}-dispatch-statement.pdf"`,
  );
  reply.header("Cache-Control", "private, max-age=300");

  await reply.send(pdfBuffer);
}
