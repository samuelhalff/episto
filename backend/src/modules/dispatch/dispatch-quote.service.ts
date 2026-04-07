import { count, eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import { getDispatchAdapter } from "./adapters/postal.adapter.js";
import { buildDispatchPackage } from "./dispatch-package.service.js";
import {
  buildDispatchPricingInput,
  hashDispatchPricingInput,
  type DispatchPricingInput,
} from "./dispatch-pricing-input.service.js";
import { getActiveMatrixQuote } from "./dispatch-rate-matrix.service.js";
import { storeResolvedQuote } from "./dispatch-quote-cache.service.js";

export async function getDispatchQuoteForDraft(
  db: Db,
  draftId: string,
) {
  const snapshot = await getLatestSnapshot(db, draftId);
  if (!snapshot) {
    throw validationError("Review the draft before requesting a delivery quote.");
  }

  const dispatchPackage = await buildDispatchPackage(db, draftId, snapshot.id, {
    allowPendingRenderedPdf: true,
  });

  return getDispatchAdapter().quotePrice(dispatchPackage);
}

interface PricingSource {
  draftId: string;
  snapshotId: string | null;
  deliveryType: "standard" | "registered";
  pricingInput: DispatchPricingInput;
  pricingInputHash: string;
}

async function buildPricingSourceForDraft(
  db: Db,
  draftId: string,
  _options: { requireSnapshot: boolean },
): Promise<PricingSource> {
  const [draft] = await db
    .select({
      deliveryType: schema.draftLetters.deliveryType,
      estimatedPages: schema.draftLetters.estimatedPages,
    })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, draftId))
    .limit(1);

  if (!draft) {
    throw notFoundError("draft");
  }

  const [attachmentResult] = await db
    .select({ total: count() })
    .from(schema.fileAssets)
    .where(
      eq(schema.fileAssets.draftId, draftId),
    );

  const attachmentCount = Number(attachmentResult?.total ?? 0);
  const estimatedPages = draft.estimatedPages ?? 1;

  const snapshot = await getLatestSnapshot(db, draftId);

  const pricingInput = buildDispatchPricingInput({
    draftId,
    snapshotId: snapshot?.id ?? null,
    deliveryType: draft.deliveryType,
    estimatedPages,
    attachmentCount,
    country: "CH",
  });

  return {
    draftId,
    snapshotId: snapshot?.id ?? null,
    deliveryType: draft.deliveryType,
    pricingInput,
    pricingInputHash: hashDispatchPricingInput(pricingInput),
  };
}

export interface ResolvedDisplayQuote {
  quote: {
    draftId: string;
    snapshotId: string | null;
    deliveryType: "standard" | "registered";
    providerQuotedCents: number;
    swissMailMarkupCents: number;
    totalCents: number;
    currency: "CHF";
    lineItems: Array<{ label: string; amountCents: number; source: "provider" | "swiss_mail" }>;
    providerQuoteReference: string | null;
    attachmentHandling: "excluded" | "single_hint" | "unverified";
  };
  meta: {
    source: "matrix" | "live";
    quotedAt: Date | null;
    expiresAt: Date | null;
  };
}

async function resolveDispatchQuoteFromCacheOrMatrix(
  db: Db,
  source: PricingSource,
  _options: { purpose: "display" },
): Promise<ResolvedDisplayQuote> {
  const matrixRow = await getActiveMatrixQuote(db, source.pricingInput);

  if (!matrixRow) {
    throw validationError(
      "Pricing is not available yet. Please try again shortly.",
    );
  }

  const cfg = env();
  const swissMailMarkupCents =
    source.deliveryType === "registered"
      ? cfg.PRICE_REGISTERED_MARKUP_CENTS
      : cfg.PRICE_STANDARD_MARKUP_CENTS;
  const totalCents = matrixRow.providerQuotedCents + swissMailMarkupCents;
  const generatedAt = new Date();

  await storeResolvedQuote(db, {
    draftId: source.draftId,
    snapshotId: source.snapshotId,
    pricingInputHash: source.pricingInputHash,
    pricingInput: source.pricingInput,
    source: "matrix",
    deliveryType: source.deliveryType,
    postage: source.pricingInput.postage,
    providerQuotedCents: matrixRow.providerQuotedCents,
    swissMailMarkupCents,
    totalCents,
    providerQuoteReference: null,
    rateMatrixVersionId: matrixRow.versionId,
    generatedAt,
    expiresAt: matrixRow.expiresAt,
  });

  return {
    quote: {
      draftId: source.draftId,
      snapshotId: source.snapshotId,
      deliveryType: source.deliveryType,
      providerQuotedCents: matrixRow.providerQuotedCents,
      swissMailMarkupCents,
      totalCents,
      currency: "CHF",
      lineItems: [
        {
          label: "Provider quote",
          amountCents: matrixRow.providerQuotedCents,
          source: "provider",
        },
        {
          label: "Swiss Mail service",
          amountCents: swissMailMarkupCents,
          source: "swiss_mail",
        },
      ],
      providerQuoteReference: null,
      attachmentHandling:
        source.pricingInput.attachmentMode === "single_hint"
          ? "single_hint"
          : "excluded",
    },
    meta: {
      source: "matrix",
      quotedAt: matrixRow.quotedAt,
      expiresAt: matrixRow.expiresAt,
    },
  };
}

export async function resolveDisplayDispatchQuoteForDraft(
  db: Db,
  draftId: string,
): Promise<ResolvedDisplayQuote> {
  const source = await buildPricingSourceForDraft(db, draftId, {
    requireSnapshot: false,
  });
  return resolveDispatchQuoteFromCacheOrMatrix(db, source, { purpose: "display" });
}

export async function resolvePaymentDispatchQuoteForDraft(
  db: Db,
  draftId: string,
): Promise<ResolvedDisplayQuote> {
  const source = await buildPricingSourceForDraft(db, draftId, {
    requireSnapshot: false,
  });
  return resolveDispatchQuoteFromCacheOrMatrix(db, source, { purpose: "display" });
}
