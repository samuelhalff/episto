import { eq } from "drizzle-orm";
import { SnapshotDataSchema, type SnapshotData } from "@episto/shared";
import { getDb } from "../../db/index.js";
import { schema } from "../../db/index.js";
import {
  createFileAsset,
  renderStorageKey,
  withOrphanCleanup,
} from "../files/file.service.js";
import { uploadObject } from "../files/adapters/s3.adapter.js";
import { AppError } from "../../shared/errors/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { loadSignatureImageAsset } from "./signature-image.js";
import { renderPdfBufferFromHtml } from "./render-pdf.js";
import { setSnapshotPdfAsset } from "./snapshot.service.js";
import { renderLetterHtml } from "./render-template.js";
import type { RenderResult } from "./render.types.js";
import { erasedDraftError } from "../../shared/errors/erased-draft.js";
import { isErasedSnapshotData } from "./snapshot-data.js";

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

  // Erased is not corrupt. Without this the scrubbed snapshot reads as a
  // rendering bug: a 500, an error log, and an invitation to "try again".
  if (isErasedSnapshotData(snapshotData)) {
    throw erasedDraftError();
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
  const signatureImage = await loadSignatureImageAsset(
    db,
    snapshotData,
    snapshot.draftId,
  );
  const html = renderLetterHtml(snapshotData, { signatureImage });
  const { pdfBuffer, pageCount } = await renderPdfBufferFromHtml(html);

  const storageKey = renderStorageKey(snapshot.draftId, snapshot.version);

  const [draft] = await db
    .select({ sessionId: schema.draftLetters.sessionId })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, snapshot.draftId))
    .limit(1);

  if (!draft) {
    throw new Error(`Draft not found: ${snapshot.draftId}`);
  }

  // Everything from here registers the object above, and does so atomically: if
  // linking the snapshot fails, the file_assets row rolls back with it, so the
  // compensating delete cannot remove an object some surviving row still owns.
  // Without the wrapper a failed insert would leave a rendered letter in
  // storage that retention — which iterates rows — can never see.
  const fileAsset = await withOrphanCleanup(db, storageKey, logger, async () => {
    await uploadObject(storageKey, pdfBuffer, "application/pdf");

    return db.transaction(async (tx) => {
      const created = await createFileAsset(tx, {
        sessionId: draft.sessionId,
        draftId: snapshot.draftId,
        kind: "rendered_pdf",
        storageKey,
        originalFilename: `letter-v${snapshot.version}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.byteLength,
      });

      await setSnapshotPdfAsset(tx, snapshotId, created.id, pageCount);
      return created;
    });
  });

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
