import type { FastifyReply } from "fastify";
import { desc, eq, inArray } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import {
  buildOrderReference,
  extractAiDocumentMetadata,
  flattenDocumentModel,
  SnapshotDataSchema,
  type DocumentModel,
  type SnapshotData,
} from "@episto/shared";
import { stripLetterFramingDocument } from "@episto/shared/letter-framing";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import { isMockEpostProviderName } from "../dispatch/adapters/epost-submission-mode.js";
import { BRAND_NAME } from "../../shared/brand.js";
import { renderConfirmationDocumentHtml } from "./confirmation-document.js";
import { renderLetterHtml, renderPdfBufferFromHtml } from "./render.service.js";
import { loadSignatureImageAsset } from "./signature-image.js";
import { getLatestSnapshot, type SnapshotRow } from "./snapshot.service.js";

interface RenderedLetterSource {
  snapshot: SnapshotRow;
  snapshotData: SnapshotData;
}

const CONFIRMATION_CONTENT_SUMMARY_MAX_LENGTH = 160;

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

function buildContentSummary(snapshotData: SnapshotData): string {
  const document = stripLetterFramingDocument(
    extractAiDocumentMetadata(snapshotData.metadata)?.document ??
      fallbackDocument(snapshotData.body ?? ""),
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

  const snapshotData = SnapshotDataSchema.parse(snapshot.snapshotData);

  return {
    snapshot,
    snapshotData,
  };
}

async function getAttachmentNames(db: Db, assetIds: string[]): Promise<string[]> {
  if (assetIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: schema.fileAssets.id,
      originalFilename: schema.fileAssets.originalFilename,
      storageKey: schema.fileAssets.storageKey,
    })
    .from(schema.fileAssets)
    .where(inArray(schema.fileAssets.id, assetIds));

  const byId = new Map(rows.map((row) => [row.id, row]));

  return assetIds.map((assetId) => {
    const row = byId.get(assetId);
    return row?.originalFilename ?? row?.storageKey.split("/").pop() ?? assetId;
  });
}

async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  const bundle = await PDFDocument.create();

  for (const sourceBytes of buffers) {
    const source = await PDFDocument.load(sourceBytes);
    const pageIndexes = source.getPageIndices();
    const pages = await bundle.copyPages(source, pageIndexes);
    pages.forEach((page) => bundle.addPage(page));
  }

  return Buffer.from(await bundle.save());
}

async function buildConfirmationBundlePdf(db: Db, draftId: string): Promise<Buffer> {
  const renderedLetter = await getRenderedLetterAsset(db, draftId);
  const signatureImage = await loadSignatureImageAsset(
    db,
    renderedLetter.snapshotData,
    draftId,
  );
  const [[dispatch], attachmentNames] = await Promise.all([
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
    getAttachmentNames(db, renderedLetter.snapshotData.attachmentAssetIds),
  ]);

  const letterHtml = renderLetterHtml(renderedLetter.snapshotData, {
    signatureImage,
  });
  const renderedLetterPdf = await renderPdfBufferFromHtml(letterHtml);

  const _letterPdf = await PDFDocument.load(renderedLetterPdf.pdfBuffer);
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
    pageCount: renderedLetterPdf.pageCount,
    attachmentNames,
    sender: renderedLetter.snapshotData.sender,
    recipient: renderedLetter.snapshotData.recipient,
    subject: renderedLetter.snapshotData.subject ?? null,
    contentSummary: buildContentSummary(renderedLetter.snapshotData),
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

  return mergePdfBuffers([confirmationFrontPage, renderedLetterPdf.pdfBuffer]);
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
