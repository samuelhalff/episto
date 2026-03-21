import type { FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import { getPresignedDownloadUrl } from "../files/adapters/s3.adapter.js";
import { getLatestSnapshot } from "./snapshot.service.js";

export async function getRenderedDraftPdfDownloadUrl(
  db: Db,
  draftId: string,
): Promise<string> {
  const snapshot = await getLatestSnapshot(db, draftId);
  if (!snapshot?.renderedPdfAssetId) {
    throw new AppError({
      family: "rendering_failure",
      statusCode: 404,
      code: "PDF_NOT_READY",
      message: "No rendered PDF is available for this draft.",
      userMessage: "Your final letter PDF is not ready yet.",
      userAction: "Please try again in a few moments.",
    });
  }

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
      message: "The rendered PDF has been deleted per retention policy.",
      userMessage: "This PDF is no longer available.",
      userAction: "PDFs are retained for a limited time after dispatch.",
    });
  }

  return getPresignedDownloadUrl(pdfAsset.storageKey, 300);
}

export async function redirectToRenderedDraftPdf(
  db: Db,
  draftId: string,
  reply: FastifyReply,
): Promise<void> {
  const downloadUrl = await getRenderedDraftPdfDownloadUrl(db, draftId);
  reply.redirect(downloadUrl);
}
