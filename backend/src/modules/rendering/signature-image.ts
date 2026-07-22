import { and, eq } from "drizzle-orm";
import type { SnapshotData } from "@episto/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { downloadObjectBuffer } from "../files/adapters/s3.adapter.js";
import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("signature-image");

export interface SignatureRenderAsset {
  mimeType: "image/png" | "image/jpeg";
  base64: string;
}

function isSignatureRenderMimeType(
  mimeType: string,
): mimeType is SignatureRenderAsset["mimeType"] {
  return mimeType === "image/png" || mimeType === "image/jpeg";
}

/** True when an S3 error means the object simply isn't there (vs. a real fault). */
function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
    ?.httpStatusCode;
  return name === "NoSuchKey" || name === "NotFound" || status === 404;
}

/**
 * Download a signature asset by id and return it as a render-ready base64 image,
 * or `null` when the asset row is absent, has an unsupported mime type, or its
 * underlying object is missing from storage. A missing object is treated as a
 * recoverable "no signature here" rather than a hard failure so the caller can
 * fall back to another candidate.
 */
async function tryLoadSignature(
  db: Db,
  assetId: string,
): Promise<SignatureRenderAsset | null> {
  const [signatureAsset] = await db
    .select({
      storageKey: schema.fileAssets.storageKey,
      mimeType: schema.fileAssets.mimeType,
    })
    .from(schema.fileAssets)
    .where(eq(schema.fileAssets.id, assetId))
    .limit(1);

  if (!signatureAsset || !isSignatureRenderMimeType(signatureAsset.mimeType)) {
    return null;
  }

  try {
    const { buffer } = await downloadObjectBuffer(signatureAsset.storageKey);
    return {
      mimeType: signatureAsset.mimeType,
      base64: buffer.toString("base64"),
    };
  } catch (error) {
    if (isMissingObjectError(error)) {
      logger.warn(
        { assetId, storageKey: signatureAsset.storageKey },
        "Signature object missing from storage; will try live signature fallback",
      );
      return null;
    }
    throw error;
  }
}

/**
 * Resolve the signature image to embed in a rendered letter.
 *
 * Primary source is the snapshot's `signatureAssetId` (the point-in-time
 * signature). If that object is missing — which happens when the customer
 * re-signs after a snapshot is taken and the replaced object is cleaned up
 * from storage — we fall back to the draft's *current* active drawn signature
 * so the render still succeeds with the customer's own signature instead of
 * failing the entire paid letter. Returns `null` when the draft genuinely has
 * no drawn signature.
 */
export async function loadSignatureImageAsset(
  db: Db,
  snapshotData: SnapshotData,
  draftId?: string,
): Promise<SignatureRenderAsset | null> {
  if (snapshotData.signatureMode !== "drawn" || !snapshotData.signatureAssetId) {
    return null;
  }

  const fromSnapshot = await tryLoadSignature(db, snapshotData.signatureAssetId);
  if (fromSnapshot) {
    return fromSnapshot;
  }

  // Snapshot signature object is unavailable — fall back to the draft's current
  // drawn signature, which is what the customer most recently intended.
  if (!draftId) {
    return null;
  }

  const [draft] = await db
    .select({
      signatureMode: schema.draftLetters.signatureMode,
      signatureAssetId: schema.draftLetters.signatureAssetId,
    })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, draftId))
    .limit(1);

  if (
    !draft ||
    draft.signatureMode !== "drawn" ||
    !draft.signatureAssetId ||
    draft.signatureAssetId === snapshotData.signatureAssetId
  ) {
    return null;
  }

  // Only trust an active (not soft-deleted) live signature asset.
  const [liveAsset] = await db
    .select({ id: schema.fileAssets.id })
    .from(schema.fileAssets)
    .where(
      and(
        eq(schema.fileAssets.id, draft.signatureAssetId),
        eq(schema.fileAssets.status, "active"),
      ),
    )
    .limit(1);

  if (!liveAsset) {
    return null;
  }

  const fromLive = await tryLoadSignature(db, draft.signatureAssetId);
  if (fromLive) {
    logger.info(
      { draftId, liveAssetId: draft.signatureAssetId },
      "Recovered render using the draft's current signature after snapshot object was missing",
    );
  }
  return fromLive;
}
