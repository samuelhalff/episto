import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import type { DispatchPricingInput } from "./dispatch-pricing-input.service.js";

export async function getFreshLiveQuoteByHash(
  db: Db,
  pricingInputHash: string,
  now = new Date(),
) {
  const [row] = await db
    .select()
    .from(schema.draftQuoteCache)
    .where(
      and(
        eq(schema.draftQuoteCache.pricingInputHash, pricingInputHash),
        eq(schema.draftQuoteCache.source, "live"),
        or(
          isNull(schema.draftQuoteCache.expiresAt),
          gt(schema.draftQuoteCache.expiresAt, now),
        ),
      ),
    )
    .orderBy(desc(schema.draftQuoteCache.generatedAt))
    .limit(1);

  return row ?? null;
}

export async function storeResolvedQuote(
  db: Db,
  values: {
    draftId: string;
    snapshotId: string | null;
    pricingInputHash: string;
    pricingInput: DispatchPricingInput;
    source: "matrix" | "live";
    deliveryType: "standard" | "registered";
    postage: string;
    providerQuotedCents: number;
    swissMailMarkupCents: number;
    totalCents: number;
    providerQuoteReference: string | null;
    rateMatrixVersionId: string | null;
    generatedAt: Date;
    expiresAt: Date | null;
  },
) {
  await db.insert(schema.draftQuoteCache).values({
    ...values,
    currency: "CHF",
  });
}
