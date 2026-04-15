import { eq } from "drizzle-orm";
import { SnapshotDataSchema, type SnapshotData } from "@swiss-mail/shared";
import { getDb } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { createFileAsset, renderStorageKey } from "../files/file.service.js";
import { uploadObject } from "../files/adapters/s3.adapter.js";
import { AppError } from "../../shared/errors/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { loadSignatureImageAsset } from "./signature-image.js";
import { renderPdfBufferFromHtml } from "./render-pdf.js";
import { setSnapshotPdfAsset } from "./snapshot.service.js";
import { renderLetterHtml } from "./render-template.js";
import type { RenderResult } from "./render.types.js";

const logger = createLogger("render-service");

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

export async function renderSnapshotToPdf(snapshotId: string): Promise<RenderResult> {
  const db = getDb();

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
  const signatureImage = await loadSignatureImageAsset(db, snapshotData);
  const html = renderLetterHtml(snapshotData, { signatureImage });
  const { pdfBuffer, pageCount } = await renderPdfBufferFromHtml(html);

  const storageKey = renderStorageKey(snapshot.draftId, snapshot.version);
  await uploadObject(storageKey, pdfBuffer, "application/pdf");

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
