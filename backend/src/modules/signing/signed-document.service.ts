import { eq } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { uploadObject } from "../files/adapters/s3.adapter.js";
import {
  createFileAsset,
  signedPdfStorageKey,
  type FileAssetRow,
} from "../files/file.service.js";
import type { SignatureSessionRow } from "./signature-session.service.js";

export async function attachSignedDocumentToSignatureSession(
  db: Db,
  input: {
    signatureSession: SignatureSessionRow;
    fileName: string;
    mimeType: "application/pdf";
    bytes: Uint8Array;
  },
): Promise<FileAssetRow> {
  const [draft] = await db
    .select({ sessionId: schema.draftLetters.sessionId })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, input.signatureSession.draftId))
    .limit(1);

  if (!draft) {
    throw notFoundError("draft");
  }

  const storageKey = signedPdfStorageKey(
    input.signatureSession.draftId,
    input.signatureSession.id,
  );
  const buffer = Buffer.from(input.bytes);

  await uploadObject(storageKey, buffer, input.mimeType);

  return createFileAsset(db, {
    sessionId: draft.sessionId,
    draftId: input.signatureSession.draftId,
    kind: "signed_pdf",
    storageKey,
    originalFilename: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: buffer.byteLength,
  });
}
