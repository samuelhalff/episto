import { and, eq, gt, isNotNull, lte } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import type { DispatchPricingInput } from "./dispatch-pricing-input.service.js";

/**
 * Retire expired active matrix versions so stale pricing does not remain the
 * current canonical source indefinitely. A later provider-backed refresh path
 * can build a new version; this job keeps the stored source of truth honest.
 */
export async function refreshDispatchRateMatrixIfNeeded(db: Db, now: Date): Promise<void> {
  const expiredVersions = await db
    .select({ id: schema.providerRateMatrixVersions.id })
    .from(schema.providerRateMatrixVersions)
    .where(
      and(
        eq(schema.providerRateMatrixVersions.status, "active"),
        isNotNull(schema.providerRateMatrixVersions.expiresAt),
        lte(schema.providerRateMatrixVersions.expiresAt, now),
      ),
    );

  for (const version of expiredVersions) {
    await db
      .update(schema.providerRateMatrixVersions)
      .set({
        status: "retired",
        updatedAt: now,
      })
      .where(eq(schema.providerRateMatrixVersions.id, version.id));
  }
}

export async function getActiveMatrixQuote(
  db: Db,
  input: DispatchPricingInput,
  now = new Date(),
): Promise<{
  providerQuotedCents: number;
  versionId: string;
  quotedAt: Date | null;
  expiresAt: Date | null;
} | null> {
  const [row] = await db
    .select({
      versionId: schema.providerRateMatrixVersions.id,
      providerQuotedCents: schema.providerRateMatrixEntries.providerQuotedCents,
      quotedAt: schema.providerRateMatrixVersions.verifiedAt,
      expiresAt: schema.providerRateMatrixVersions.expiresAt,
    })
    .from(schema.providerRateMatrixEntries)
    .innerJoin(
      schema.providerRateMatrixVersions,
      eq(
        schema.providerRateMatrixEntries.versionId,
        schema.providerRateMatrixVersions.id,
      ),
    )
    .where(
      and(
        eq(schema.providerRateMatrixVersions.status, "active"),
        isNotNull(schema.providerRateMatrixVersions.expiresAt),
        gt(schema.providerRateMatrixVersions.expiresAt, now),
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

  return row ?? null;
}
