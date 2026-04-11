import { eq } from "drizzle-orm";
import type { SnapshotData } from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { downloadObjectBuffer } from "../files/adapters/s3.adapter.js";

export async function loadSignatureImageBase64(
  db: Db,
  snapshotData: SnapshotData,
): Promise<string | null> {
  if (snapshotData.signatureMode !== "drawn" || !snapshotData.signatureAssetId) {
    return null;
  }

  const [signatureAsset] = await db
    .select({ storageKey: schema.fileAssets.storageKey })
    .from(schema.fileAssets)
    .where(eq(schema.fileAssets.id, snapshotData.signatureAssetId))
    .limit(1);

  if (!signatureAsset) {
    return null;
  }

  const { buffer } = await downloadObjectBuffer(signatureAsset.storageKey);
  return buffer.toString("base64");
}
