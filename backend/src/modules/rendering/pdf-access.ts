import type { FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import { downloadObject } from "../files/adapters/s3.adapter.js";
import { getLatestSnapshot } from "./snapshot.service.js";

async function getRenderedDraftPdfAsset(
  db: Db,
  draftId: string,
): Promise<{ storageKey: string }> {
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

  return {
    storageKey: pdfAsset.storageKey,
  };
}

export async function sendRenderedDraftPdf(
  db: Db,
  draftId: string,
  reply: FastifyReply,
): Promise<void> {
  const pdfAsset = await getRenderedDraftPdfAsset(db, draftId);
  const pdf = await downloadObject(pdfAsset.storageKey);

  reply.header("Content-Type", pdf.contentType ?? "application/pdf");
  if (pdf.contentLength !== undefined) {
    reply.header("Content-Length", String(pdf.contentLength));
  }
  if (pdf.eTag) {
    reply.header("ETag", pdf.eTag);
  }
  if (pdf.lastModified) {
    reply.header("Last-Modified", pdf.lastModified.toUTCString());
  }
  reply.header(
    "Content-Disposition",
    `attachment; filename="swiss-mail-${draftId.slice(0, 8)}.pdf"`,
  );
  reply.header("Cache-Control", "private, max-age=300");

  await reply.send(pdf.body);
}
