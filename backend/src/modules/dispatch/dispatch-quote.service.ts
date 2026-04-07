import type { Db } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { validationError } from "../../shared/errors/index.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import { getDispatchAdapter } from "./adapters/postal.adapter.js";
import {
  buildDispatchPackage,
  getDraftPricingInputs,
} from "./dispatch-package.service.js";
import {
  buildDispatchPricingInput,
  hashDispatchPricingInput,
  type DispatchPricingInput,
} from "./dispatch-pricing-input.service.js";
import { getActiveMatrixQuote } from "./dispatch-rate-matrix.service.js";
import {
  getFreshLiveQuoteByHash,
  storeResolvedQuote,
} from "./dispatch-quote-cache.service.js";

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
): Promise<PricingSource> {
  const inputs = await getDraftPricingInputs(db, draftId);
  const snapshot = await getLatestSnapshot(db, draftId);

  const pricingInput = buildDispatchPricingInput({
    draftId,
    snapshotId: snapshot?.id ?? null,
    deliveryType: inputs.deliveryType,
    estimatedPages: inputs.estimatedPages,
    attachmentCount: inputs.attachmentCount,
  });

  return {
    draftId,
    snapshotId: snapshot?.id ?? null,
    deliveryType: inputs.deliveryType,
    pricingInput,
    pricingInputHash: hashDispatchPricingInput(pricingInput),
  };
}

export interface ResolvedDispatchQuote {
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
): Promise<ResolvedDispatchQuote> {
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
): Promise<ResolvedDispatchQuote> {
  const source = await buildPricingSourceForDraft(db, draftId);
  return resolveDispatchQuoteFromCacheOrMatrix(db, source, { purpose: "display" });
}

async function resolveDispatchQuoteFromCacheOrLiveProvider(
  db: Db,
  source: PricingSource,
): Promise<ResolvedDispatchQuote> {
  const cached = await getFreshLiveQuoteByHash(db, source.pricingInputHash);
  if (cached) {
    return {
      quote: {
        draftId: cached.draftId,
        snapshotId: cached.snapshotId,
        deliveryType: cached.deliveryType,
        providerQuotedCents: cached.providerQuotedCents,
        swissMailMarkupCents: cached.swissMailMarkupCents,
        totalCents: cached.totalCents,
        currency: "CHF",
        lineItems: [
          {
            label: "Provider quote",
            amountCents: cached.providerQuotedCents,
            source: "provider",
          },
          {
            label: "Swiss Mail service",
            amountCents: cached.swissMailMarkupCents,
            source: "swiss_mail",
          },
        ],
        providerQuoteReference: cached.providerQuoteReference,
        attachmentHandling:
          source.pricingInput.attachmentMode === "single_hint"
            ? "single_hint"
            : "excluded",
      },
      meta: {
        source: "live",
        quotedAt: cached.generatedAt,
        expiresAt: cached.expiresAt,
      },
    };
  }

  const snapshot = await getLatestSnapshot(db, source.draftId);
  if (!snapshot) {
    throw validationError("Review the draft before requesting a checkout price.");
  }

  const dispatchPackage = await buildDispatchPackage(db, source.draftId, snapshot.id, {
    allowPendingRenderedPdf: true,
  });

  const providerQuote = await getDispatchAdapter().quotePrice(dispatchPackage);
  const generatedAt = new Date();

  const cfg = env();
  const liveTtlMs = cfg.LIVE_DISPATCH_QUOTE_TTL_MINUTES * 60 * 1000;
  const liveExpiresAt = new Date(generatedAt.getTime() + liveTtlMs);

  await storeResolvedQuote(db, {
    draftId: source.draftId,
    snapshotId: snapshot.id,
    pricingInputHash: source.pricingInputHash,
    pricingInput: source.pricingInput,
    source: "live",
    deliveryType: source.deliveryType,
    postage: source.pricingInput.postage,
    providerQuotedCents: providerQuote.providerQuotedCents,
    swissMailMarkupCents: providerQuote.swissMailMarkupCents,
    totalCents: providerQuote.totalCents,
    providerQuoteReference: providerQuote.providerQuoteReference,
    rateMatrixVersionId: null,
    generatedAt,
    expiresAt: liveExpiresAt,
  });

  return {
    quote: {
      draftId: providerQuote.draftId,
      snapshotId: providerQuote.snapshotId,
      deliveryType: providerQuote.deliveryType,
      providerQuotedCents: providerQuote.providerQuotedCents,
      swissMailMarkupCents: providerQuote.swissMailMarkupCents,
      totalCents: providerQuote.totalCents,
      currency: "CHF",
      lineItems: providerQuote.lineItems,
      providerQuoteReference: providerQuote.providerQuoteReference,
      attachmentHandling: providerQuote.attachmentHandling,
    },
    meta: {
      source: "live",
      quotedAt: generatedAt,
      expiresAt: liveExpiresAt,
    },
  };
}

export async function resolvePaymentDispatchQuoteForDraft(
  db: Db,
  draftId: string,
): Promise<ResolvedDispatchQuote> {
  const source = await buildPricingSourceForDraft(db, draftId);
  return resolveDispatchQuoteFromCacheOrLiveProvider(db, source);
}
