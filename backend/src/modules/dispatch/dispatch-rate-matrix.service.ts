import { and, desc, eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import type { DispatchPricingInput } from "./dispatch-pricing-input.service.js";

async function getLatestActiveMatrixVersion(db: Db): Promise<{
  id: string;
  verifiedAt: Date | null;
  expiresAt: Date | null;
} | null> {
  const [version] = await db
    .select({
      id: schema.providerRateMatrixVersions.id,
      verifiedAt: schema.providerRateMatrixVersions.verifiedAt,
      expiresAt: schema.providerRateMatrixVersions.expiresAt,
    })
    .from(schema.providerRateMatrixVersions)
    .where(
      and(
        eq(schema.providerRateMatrixVersions.status, "active"),
        eq(schema.providerRateMatrixVersions.providerName, "epost"),
      ),
    )
    .orderBy(
      desc(schema.providerRateMatrixVersions.verifiedAt),
      desc(schema.providerRateMatrixVersions.effectiveAt),
      desc(schema.providerRateMatrixVersions.createdAt),
    )
    .limit(1);

  return version ?? null;
}

export async function getStoredMatrixQuote(
  db: Db,
  input: DispatchPricingInput,
  now = new Date(),
): Promise<{
  versionId: string;
  providerQuotedCents: number;
  quotedAt: Date | null;
  expiresAt: Date | null;
  freshness: "fresh" | "stale";
} | null> {
  const version = await getLatestActiveMatrixVersion(db);

  if (!version) {
    return null;
  }

  const [row] = await db
    .select({
      versionId: schema.providerRateMatrixEntries.versionId,
      providerQuotedCents: schema.providerRateMatrixEntries.providerQuotedCents,
    })
    .from(schema.providerRateMatrixEntries)
    .where(
      and(
        eq(schema.providerRateMatrixEntries.versionId, version.id),
        eq(schema.providerRateMatrixEntries.postage, input.postage),
        eq(schema.providerRateMatrixEntries.numberOfPage, input.numberOfPage),
        eq(schema.providerRateMatrixEntries.attachmentMode, input.attachmentMode),
        eq(schema.providerRateMatrixEntries.shippingCountry, input.shippingCountry),
        eq(schema.providerRateMatrixEntries.envelopeSize, input.envelopeSize),
        eq(schema.providerRateMatrixEntries.windowLocation, input.windowLocation),
        eq(schema.providerRateMatrixEntries.duplex, input.duplex),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    versionId: row.versionId,
    providerQuotedCents: row.providerQuotedCents,
    quotedAt: version.verifiedAt,
    expiresAt: version.expiresAt,
    freshness:
      version.expiresAt && version.expiresAt.getTime() > now.getTime()
        ? "fresh"
        : "stale",
  };
}
