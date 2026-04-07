import { and, eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import type { DispatchPricingInput } from "./dispatch-pricing-input.service.js";

export async function getActiveMatrixQuote(
  db: Db,
  input: DispatchPricingInput,
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
