import type { FastifyReply } from "fastify";
import { desc, eq, inArray } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import {
  extractAiDocumentMetadata,
  flattenDocumentModel,
  SnapshotDataSchema,
  type DocumentModel,
  type SnapshotData,
} from "@swiss-mail/shared";
import { stripLetterFramingDocument } from "@swiss-mail/shared/letter-framing";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import { isMockEpostProviderName } from "../dispatch/adapters/epost-submission-mode.js";
import { downloadObjectBuffer } from "../files/adapters/s3.adapter.js";
import { renderConfirmationDocumentHtml } from "./confirmation-document.js";
import { renderPdfBufferFromHtml } from "./render.service.js";
import { getLatestSnapshot, type SnapshotRow } from "./snapshot.service.js";

interface RenderedLetterAsset {
  snapshot: SnapshotRow;
  snapshotData: SnapshotData;
  storageKey: string;
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
): Promise<RenderedLetterAsset> {
  const snapshot = await getLatestSnapshot(db, draftId);
  if (!snapshot || !snapshot.renderedPdfAssetId) {
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

  const [pdfAsset] = await db
    .select({
      storageKey: schema.fileAssets.storageKey,
      status: schema.fileAssets.status,
    })
    .from(schema.fileAssets)
    .where(eq(schema.fileAssets.id, snapshot.renderedPdfAssetId))
    .limit(1);

  if (!pdfAsset || pdfAsset.status !== "active") {
    throw new AppError({
      family: "rendering_failure",
      statusCode: 410,
      code: "PDF_EXPIRED",
      message: "The rendered letter PDF has been deleted per retention policy.",
      userMessage: "The confirmation document is no longer available.",
      userAction: "Confirmation bundles are retained for a limited time after dispatch.",
    });
  }

  return {
    snapshot,
    snapshotData,
    storageKey: pdfAsset.storageKey,
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
  const [[dispatch], attachmentNames, downloadedLetter] = await Promise.all([
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
    downloadObjectBuffer(renderedLetter.storageKey),
  ]);

  const letterPdf = await PDFDocument.load(downloadedLetter.buffer);
  const providerMode: "mock" | "live" | null = dispatch
    ? isMockEpostProviderName(dispatch.providerName)
      ? "mock"
      : "live"
    : null;
  const confirmationHtml = renderConfirmationDocumentHtml({
    orderRef: `SM-${draftId.slice(0, 8).toUpperCase()}`,
    locale: renderedLetter.snapshotData.locale,
    submittedAt:
      dispatch?.submittedAt ?? dispatch?.createdAt ?? renderedLetter.snapshot.createdAt,
    dispatchState: dispatch?.state ?? "queued",
    deliveryType: renderedLetter.snapshotData.deliveryType,
    providerMode,
    providerReference: dispatch?.providerReference ?? null,
    trackingNumber: dispatch?.trackingNumber ?? null,
    pageCount: letterPdf.getPageCount(),
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

  return mergePdfBuffers([confirmationFrontPage, downloadedLetter.buffer]);
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
    `attachment; filename="swiss-mail-${draftId.slice(0, 8)}-confirmation.pdf"`,
  );
  reply.header("Cache-Control", "private, max-age=300");

  await reply.send(pdfBuffer);
}
