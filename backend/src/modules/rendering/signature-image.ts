import { eq } from "drizzle-orm";
import type { SnapshotData } from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { downloadObjectBuffer } from "../files/adapters/s3.adapter.js";

export interface SignatureRenderAsset {
  mimeType: "image/png" | "image/jpeg";
  base64: string;
}

export async function loadSignatureImageAsset(
  db: Db,
  snapshotData: SnapshotData,
): Promise<SignatureRenderAsset | null> {
  if (snapshotData.signatureMode !== "drawn" || !snapshotData.signatureAssetId) {
    return null;
  }

  const [signatureAsset] = await db
    .select({
      storageKey: schema.fileAssets.storageKey,
      mimeType: schema.fileAssets.mimeType,
    })
    .from(schema.fileAssets)
    .where(eq(schema.fileAssets.id, snapshotData.signatureAssetId))
    .limit(1);

  if (!signatureAsset) {
    return null;
  }

  const { buffer } = await downloadObjectBuffer(signatureAsset.storageKey);
  return {
    mimeType: signatureAsset.mimeType as "image/png" | "image/jpeg",
    base64: buffer.toString("base64"),
  };
}
