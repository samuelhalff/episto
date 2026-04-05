import { and, eq, inArray } from "drizzle-orm";
import {
  DispatchPackageSchema,
  SnapshotDataSchema,
  type DispatchFileAsset,
  type DispatchPackage,
} from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";

function toDispatchFileAsset(
  asset: typeof schema.fileAssets.$inferSelect,
): DispatchFileAsset {
  return {
    fileAssetId: asset.id,
    filename: asset.originalFilename ?? asset.storageKey.split("/").pop() ?? asset.id,
    storageKey: asset.storageKey,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
  };
}

function resolveEstimatedPages(
  ...candidates: Array<number | null | undefined>
): number | null {
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return null;
}

async function getFileAssetsByIds(
  db: Db,
  ids: string[],
): Promise<Map<string, typeof schema.fileAssets.$inferSelect>> {
  if (ids.length === 0) {
    return new Map();
  }

  const rows = await db
    .select()
    .from(schema.fileAssets)
    .where(
      and(inArray(schema.fileAssets.id, ids), eq(schema.fileAssets.status, "active")),
    );

  return new Map(rows.map((row) => [row.id, row]));
}

export async function buildDispatchPackage(
  db: Db,
  draftId: string,
  snapshotId: string,
  options?: { allowPendingRenderedPdf?: boolean },
): Promise<DispatchPackage> {
  const [snapshot] = await db
    .select()
    .from(schema.draftSnapshots)
    .where(
      and(
        eq(schema.draftSnapshots.id, snapshotId),
        eq(schema.draftSnapshots.draftId, draftId),
      ),
    )
    .limit(1);
  const [draft] = await db
    .select({ estimatedPages: schema.draftLetters.estimatedPages })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, draftId))
    .limit(1);

  if (!snapshot) {
    throw notFoundError("snapshot");
  }
  if (!draft) {
    throw notFoundError("draft");
  }

  const snapshotData = SnapshotDataSchema.parse(snapshot.snapshotData);
  const estimatedPages = resolveEstimatedPages(
    snapshotData.estimatedPages,
    draft.estimatedPages,
  );

  if (estimatedPages === null) {
    throw validationError("Final page count is not ready yet.", [
      {
        field: "estimatedPages",
        message:
          "The rendered letter is still being prepared. Wait for the preview to finish rendering, then request pricing again.",
      },
    ]);
  }

  const assetIds = [
    ...(snapshot.renderedPdfAssetId ? [snapshot.renderedPdfAssetId] : []),
    ...snapshotData.attachmentAssetIds,
  ];
  const assetsById = await getFileAssetsByIds(db, assetIds);
  const renderedPdfAsset = snapshot.renderedPdfAssetId
    ? assetsById.get(snapshot.renderedPdfAssetId)
    : undefined;

  if (!renderedPdfAsset && !options?.allowPendingRenderedPdf) {
    throw notFoundError("rendered PDF");
  }

  const attachments = snapshotData.attachmentAssetIds.map((assetId) => {
    const attachment = assetsById.get(assetId);
    if (!attachment) {
      throw notFoundError(`attachment ${assetId}`);
    }

    return toDispatchFileAsset(attachment);
  });

  return DispatchPackageSchema.parse({
    draftId,
    snapshotId: snapshot.id,
    locale: snapshotData.locale,
    deliveryType: snapshotData.deliveryType,
    estimatedPages,
    sender: {
      firstName: snapshotData.sender.firstName,
      lastName: snapshotData.sender.lastName,
      company: snapshotData.sender.company,
      addressLine1: snapshotData.sender.addressLine1,
      addressLine2: snapshotData.sender.addressLine2,
      postalCode: snapshotData.sender.postalCode,
      city: snapshotData.sender.city,
      country: snapshotData.sender.country,
    },
    recipient: {
      firstName: snapshotData.recipient.firstName,
      lastName: snapshotData.recipient.lastName,
      company: snapshotData.recipient.company,
      department: snapshotData.recipient.department,
      addressLine1: snapshotData.recipient.addressLine1,
      addressLine2: snapshotData.recipient.addressLine2,
      postalCode: snapshotData.recipient.postalCode,
      city: snapshotData.recipient.city,
      country: snapshotData.recipient.country,
    },
    renderedPdf: renderedPdfAsset
      ? toDispatchFileAsset(renderedPdfAsset)
      : {
          fileAssetId: snapshot.id,
          filename: `draft-${draftId}.pdf`,
          storageKey: `pending-renders/${snapshot.id}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 0,
        },
    attachments,
  });
}
