import { and, eq, inArray } from "drizzle-orm";
import {
  PublicPricingResponseSchema,
  type PostalPostage,
  type PublicPricingPageCountExample,
} from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { AppError } from "../../shared/errors/index.js";

const PUBLIC_PAGE_COUNTS = [1, 2, 3, 4, 5] as const;
const PUBLIC_REFERENCE_ASSUMPTIONS = {
  shippingCountry: "CH",
  envelopeSize: "C5",
  windowLocation: "RIGHT",
  duplex: false,
  attachmentMode: "none",
} as const;

const PRICING_UNAVAILABLE_MESSAGE =
  "Public pricing is unavailable because no usable active provider rate matrix exists.";

export interface PublicPricingMatrixVersion {
  id: string;
  providerName: string;
  status: "active";
  verifiedAt: Date | null;
  effectiveAt: Date | null;
  expiresAt: Date | null;
  sourceEndpoint: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicPricingMatrixEntry {
  id: string;
  versionId: string;
  postage: PostalPostage;
  numberOfPage: number;
  attachmentMode: "none" | "single_hint";
  shippingCountry: "CH";
  envelopeSize: "C5";
  windowLocation: "RIGHT";
  duplex: false;
  providerQuotedCents: number;
  currency: "CHF";
  providerQuoteReference: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

function getLatestTimestampCandidates(
  versions: PublicPricingMatrixVersion[],
  getTimestamp: (version: PublicPricingMatrixVersion) => Date | null,
): PublicPricingMatrixVersion[] {
  const withTimestamp = versions
    .map((version) => ({
      version,
      timestamp: getTimestamp(version)?.getTime() ?? null,
    }))
    .filter(
      (entry): entry is { version: PublicPricingMatrixVersion; timestamp: number } =>
        entry.timestamp !== null,
    );

  if (withTimestamp.length === 0) {
    return [];
  }

  const latestTimestamp = Math.max(...withTimestamp.map((entry) => entry.timestamp));
  return withTimestamp
    .filter((entry) => entry.timestamp === latestTimestamp)
    .map((entry) => entry.version);
}

function selectSingleCandidateOrThrow(
  versions: PublicPricingMatrixVersion[],
): PublicPricingMatrixVersion {
  if (versions.length !== 1) {
    throw pricingUnavailableError(
      "Public pricing is unavailable because the active provider rate matrix selection is ambiguous.",
    );
  }

  return versions[0]!;
}

function pricingUnavailableError(message = PRICING_UNAVAILABLE_MESSAGE): AppError {
  return new AppError({
    family: "provider_outage",
    statusCode: 503,
    code: "PRICING_UNAVAILABLE",
    message,
    userMessage: "Pricing is temporarily unavailable.",
    userAction: "Please try again shortly.",
  });
}

function normalizeProviderName(providerName: string): string {
  const normalized = providerName.trim();

  if (normalized.length === 0) {
    throw pricingUnavailableError(
      "Public pricing is unavailable because the active provider rate matrix is missing a valid provider name.",
    );
  }

  return normalized.toLowerCase() === "epost" ? "ePost" : normalized;
}

function getSourceUrl(version: PublicPricingMatrixVersion): string {
  if (!version.sourceEndpoint) {
    throw pricingUnavailableError(
      "Public pricing is unavailable because the active provider rate matrix is missing its source URL.",
    );
  }

  try {
    const sourceUrl = new URL(version.sourceEndpoint);
    if (sourceUrl.protocol !== "http:" && sourceUrl.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    return sourceUrl.toString();
  } catch {
    throw pricingUnavailableError(
      "Public pricing is unavailable because the active provider rate matrix has an invalid source URL.",
    );
  }
}

export function getLastSyncedAt(version: PublicPricingMatrixVersion): Date {
  return version.verifiedAt ?? version.effectiveAt ?? version.createdAt;
}

function getVerifiedDate(version: PublicPricingMatrixVersion): string {
  if (!version.verifiedAt) {
    throw pricingUnavailableError(
      "Public pricing is unavailable because the active provider rate matrix is missing verification metadata.",
    );
  }

  return version.verifiedAt.toISOString().slice(0, 10);
}

function getMatrixEntryKey(postage: PostalPostage, pageCount: number): string {
  return `${postage}:${pageCount}`;
}

function buildPageCountExample(
  pageCount: number,
  providerQuotedCents: number,
  swissMailMarkupCents: number,
): PublicPricingPageCountExample {
  const totalCents = providerQuotedCents + swissMailMarkupCents;

  return {
    pageCount,
    providerQuotedCents,
    providerQuotedDisplayPrice: formatCHF(providerQuotedCents),
    totalCents,
    displayPrice: formatCHF(totalCents),
    currency: "CHF",
  };
}

export function selectCanonicalActivePublicPricingVersion(
  versions: PublicPricingMatrixVersion[],
): PublicPricingMatrixVersion | null {
  if (versions.length === 0) {
    return null;
  }

  const latestEffectiveAt = getLatestTimestampCandidates(
    versions,
    (version) => version.effectiveAt,
  );
  const latestVerifiedAt = getLatestTimestampCandidates(
    versions,
    (version) => version.verifiedAt,
  );

  if (latestEffectiveAt.length > 0) {
    if (latestVerifiedAt.length === 0) {
      return selectSingleCandidateOrThrow(latestEffectiveAt);
    }

    const latestEffectiveIds = new Set(latestEffectiveAt.map((version) => version.id));
    const latestVerifiedWithinEffectiveAt = latestVerifiedAt.filter((version) =>
      latestEffectiveIds.has(version.id),
    );

    if (latestVerifiedWithinEffectiveAt.length !== latestVerifiedAt.length) {
      throw pricingUnavailableError(
        "Public pricing is unavailable because the active provider rate matrix selection is ambiguous.",
      );
    }

    return selectSingleCandidateOrThrow(latestVerifiedWithinEffectiveAt);
  }

  if (latestVerifiedAt.length > 0) {
    return selectSingleCandidateOrThrow(latestVerifiedAt);
  }

  return selectSingleCandidateOrThrow(versions);
}

function getRequiredEntry(
  entryMap: Map<string, PublicPricingMatrixEntry>,
  postage: PostalPostage,
  pageCount: number,
): PublicPricingMatrixEntry {
  const entry = entryMap.get(getMatrixEntryKey(postage, pageCount));

  if (!entry) {
    throw pricingUnavailableError(
      "Public pricing is unavailable because the active provider rate matrix is missing required reference rows.",
    );
  }

  return entry;
}

export function formatCHF(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `CHF ${whole}.${frac.toString().padStart(2, "0")}`;
}

export function buildPublicPricingResponse(args: {
  version: PublicPricingMatrixVersion | null;
  entries: PublicPricingMatrixEntry[];
  now?: Date;
}) {
  const { version, entries, now = new Date() } = args;

  if (!version) {
    throw pricingUnavailableError();
  }

  const config = env();
  const standardPostage = config.EPOST_STANDARD_POSTAGE as PostalPostage;
  const registeredPostage = config.EPOST_REGISTERED_POSTAGE as PostalPostage;
  const entryMap = new Map<string, PublicPricingMatrixEntry>();

  for (const entry of entries) {
    if (entry.currency !== "CHF") {
      throw pricingUnavailableError(
        "Public pricing is unavailable because the active provider rate matrix is not in CHF.",
      );
    }

    const key = getMatrixEntryKey(entry.postage, entry.numberOfPage);
    if (entryMap.has(key)) {
      throw pricingUnavailableError(
        "Public pricing is unavailable because the active provider rate matrix has duplicate reference rows.",
      );
    }

    entryMap.set(key, entry);
  }

  const standardExamples = PUBLIC_PAGE_COUNTS.map((pageCount) =>
    buildPageCountExample(
      pageCount,
      getRequiredEntry(entryMap, standardPostage, pageCount).providerQuotedCents,
      config.PRICE_STANDARD_MARKUP_CENTS,
    ),
  );
  const registeredExamples = PUBLIC_PAGE_COUNTS.map((pageCount) =>
    buildPageCountExample(
      pageCount,
      getRequiredEntry(entryMap, registeredPostage, pageCount).providerQuotedCents,
      config.PRICE_REGISTERED_MARKUP_CENTS,
    ),
  );
  const standard = standardExamples[0]!;
  const registered = registeredExamples[0]!;

  if (registered.providerQuotedCents < standard.providerQuotedCents) {
    throw pricingUnavailableError(
      "Public pricing is unavailable because the registered rate is lower than the standard rate in the active matrix.",
    );
  }

  const registeredSurchargeCents = registered.totalCents - standard.totalCents;
  if (registeredSurchargeCents < 0) {
    throw pricingUnavailableError(
      "Public pricing is unavailable because the registered surcharge is negative in the active matrix.",
    );
  }
  const freshness =
    !version.expiresAt || version.expiresAt.getTime() <= now.getTime() ? "stale" : "fresh";
  const providerName = normalizeProviderName(version.providerName);
  const sourceUrl = getSourceUrl(version);

  try {
    return PublicPricingResponseSchema.parse({
      standard: {
        totalCents: standard.totalCents,
        displayPrice: standard.displayPrice,
        currency: "CHF",
        providerQuotedCents: standard.providerQuotedCents,
        providerQuotedDisplayPrice: standard.providerQuotedDisplayPrice,
        swissMailMarkupCents: config.PRICE_STANDARD_MARKUP_CENTS,
        swissMailMarkupDisplayPrice: formatCHF(config.PRICE_STANDARD_MARKUP_CENTS),
      },
      registered: {
        totalCents: registered.totalCents,
        displayPrice: registered.displayPrice,
        currency: "CHF",
        providerQuotedCents: registered.providerQuotedCents,
        providerQuotedDisplayPrice: registered.providerQuotedDisplayPrice,
        swissMailMarkupCents: config.PRICE_REGISTERED_MARKUP_CENTS,
        swissMailMarkupDisplayPrice: formatCHF(config.PRICE_REGISTERED_MARKUP_CENTS),
      },
      registeredSurchargeCents,
      registeredSurchargeDisplayPrice: formatCHF(registeredSurchargeCents),
      sync: {
        sourceLabel: `${providerName} active rate matrix`,
        lastSyncedAt: getLastSyncedAt(version).toISOString(),
        freshness,
      },
      providerBreakdown: {
        providerName,
        note: "Public pricing examples come from the active stored provider rate matrix for Swiss domestic no-attachment letters.",
        sourceUrl,
        verifiedDate: getVerifiedDate(version),
        referenceScenario: {
          ...PUBLIC_REFERENCE_ASSUMPTIONS,
          standardPostage,
          registeredPostage,
        },
        pageCountExamples: {
          standard: standardExamples,
          registered: registeredExamples,
        },
        pricesExcludeVat: true,
        currency: "CHF",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw pricingUnavailableError(
      "Public pricing is unavailable because the active provider rate matrix metadata could not be normalized.",
    );
  }
}

async function loadActivePublicPricingMatrix(
  db: Db,
): Promise<{
  version: PublicPricingMatrixVersion | null;
  entries: PublicPricingMatrixEntry[];
}> {
  const versions = await db
    .select({
      id: schema.providerRateMatrixVersions.id,
      providerName: schema.providerRateMatrixVersions.providerName,
      status: schema.providerRateMatrixVersions.status,
      verifiedAt: schema.providerRateMatrixVersions.verifiedAt,
      effectiveAt: schema.providerRateMatrixVersions.effectiveAt,
      expiresAt: schema.providerRateMatrixVersions.expiresAt,
      sourceEndpoint: schema.providerRateMatrixVersions.sourceEndpoint,
      createdAt: schema.providerRateMatrixVersions.createdAt,
      updatedAt: schema.providerRateMatrixVersions.updatedAt,
    })
    .from(schema.providerRateMatrixVersions)
    .where(eq(schema.providerRateMatrixVersions.status, "active"));
  const version = selectCanonicalActivePublicPricingVersion(
    versions as PublicPricingMatrixVersion[],
  );

  if (!version) {
    return {
      version: null,
      entries: [],
    };
  }

  const config = env();
  const entries = await db
    .select({
      id: schema.providerRateMatrixEntries.id,
      versionId: schema.providerRateMatrixEntries.versionId,
      postage: schema.providerRateMatrixEntries.postage,
      numberOfPage: schema.providerRateMatrixEntries.numberOfPage,
      attachmentMode: schema.providerRateMatrixEntries.attachmentMode,
      shippingCountry: schema.providerRateMatrixEntries.shippingCountry,
      envelopeSize: schema.providerRateMatrixEntries.envelopeSize,
      windowLocation: schema.providerRateMatrixEntries.windowLocation,
      duplex: schema.providerRateMatrixEntries.duplex,
      providerQuotedCents: schema.providerRateMatrixEntries.providerQuotedCents,
      currency: schema.providerRateMatrixEntries.currency,
      providerQuoteReference: schema.providerRateMatrixEntries.providerQuoteReference,
      verifiedAt: schema.providerRateMatrixEntries.verifiedAt,
      createdAt: schema.providerRateMatrixEntries.createdAt,
    })
    .from(schema.providerRateMatrixEntries)
    .where(
      and(
        eq(schema.providerRateMatrixEntries.versionId, version.id),
        inArray(schema.providerRateMatrixEntries.postage, [
          config.EPOST_STANDARD_POSTAGE,
          config.EPOST_REGISTERED_POSTAGE,
        ]),
        inArray(schema.providerRateMatrixEntries.numberOfPage, [...PUBLIC_PAGE_COUNTS]),
        eq(
          schema.providerRateMatrixEntries.attachmentMode,
          PUBLIC_REFERENCE_ASSUMPTIONS.attachmentMode,
        ),
        eq(
          schema.providerRateMatrixEntries.shippingCountry,
          PUBLIC_REFERENCE_ASSUMPTIONS.shippingCountry,
        ),
        eq(
          schema.providerRateMatrixEntries.envelopeSize,
          PUBLIC_REFERENCE_ASSUMPTIONS.envelopeSize,
        ),
        eq(
          schema.providerRateMatrixEntries.windowLocation,
          PUBLIC_REFERENCE_ASSUMPTIONS.windowLocation,
        ),
        eq(schema.providerRateMatrixEntries.duplex, PUBLIC_REFERENCE_ASSUMPTIONS.duplex),
      ),
    );

  return {
    version: version as PublicPricingMatrixVersion,
    entries: entries as PublicPricingMatrixEntry[],
  };
}

export async function getPublicPricing(db: Db) {
  const source = await loadActivePublicPricingMatrix(db);
  return buildPublicPricingResponse(source);
}
