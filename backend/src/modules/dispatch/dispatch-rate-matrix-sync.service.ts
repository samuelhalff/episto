import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import type { DispatchAdapter } from "./adapters/postal.adapter.js";
import { getDispatchAdapter } from "./adapters/postal.adapter.js";
import type { DispatchPricingInput } from "./dispatch-pricing-input.service.js";

const CANONICAL_PAGE_COUNTS = [1, 2, 3, 4, 5] as const;
const CANONICAL_ATTACHMENT_MODES = ["none", "single_hint"] as const;

export function buildCanonicalRateMatrixInputs(config = env()): DispatchPricingInput[] {
  return [
    { deliveryType: "standard" as const, postage: config.EPOST_STANDARD_POSTAGE },
    { deliveryType: "registered" as const, postage: config.EPOST_REGISTERED_POSTAGE },
  ].flatMap(({ deliveryType, postage }) =>
    CANONICAL_ATTACHMENT_MODES.flatMap((attachmentMode) =>
      CANONICAL_PAGE_COUNTS.map((numberOfPage) => ({
        deliveryType,
        postage,
        numberOfPage,
        attachmentMode,
        shippingCountry: "CH" as const,
        envelopeSize: "C5" as const,
        windowLocation: "LEFT" as const,
        duplex: false as const,
      })),
    ),
  );
}

export async function syncDispatchRateMatrix(args: {
  db: Db;
  adapter?: DispatchAdapter;
  now?: Date;
}) {
  const { db, adapter = getDispatchAdapter(), now = new Date() } = args;
  const config = env();
  const versionId = randomUUID();
  const expiresAt = new Date(
    now.getTime() + config.DISPATCH_RATE_MATRIX_TTL_HOURS * 60 * 60 * 1000,
  );
  const inputs = buildCanonicalRateMatrixInputs(config);
  const sourceEndpoint = `${config.EPOST_API_BASE_URL.replace(/\/$/, "")}/epost/preview/delivery-prices`;

  await db.insert(schema.providerRateMatrixVersions).values({
    id: versionId,
    providerName: "epost",
    status: "building",
    sourceEndpoint,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const entries: Array<{
      id: string;
      versionId: string;
      postage: string;
      numberOfPage: number;
      attachmentMode: string;
      shippingCountry: "CH";
      envelopeSize: "C5";
      windowLocation: "LEFT";
      duplex: false;
      providerQuotedCents: number;
      currency: "CHF";
      providerQuoteReference: string | null;
      verifiedAt: Date;
      createdAt: Date;
    }> = [];

    for (const input of inputs) {
      const quote = await adapter.quoteReferencePrice(input);
      entries.push({
        id: randomUUID(),
        versionId,
        postage: input.postage,
        numberOfPage: input.numberOfPage,
        attachmentMode: input.attachmentMode,
        shippingCountry: input.shippingCountry,
        envelopeSize: input.envelopeSize,
        windowLocation: input.windowLocation,
        duplex: input.duplex,
        providerQuotedCents: quote.providerQuotedCents,
        currency: "CHF",
        providerQuoteReference: quote.providerQuoteReference,
        verifiedAt: quote.quotedAt ?? now,
        createdAt: now,
      });
    }

    await db.transaction(async (tx) => {
      await tx.insert(schema.providerRateMatrixEntries).values(entries);
      await tx
        .update(schema.providerRateMatrixVersions)
        .set({ status: "retired", updatedAt: now })
        .where(
          and(
            eq(schema.providerRateMatrixVersions.status, "active"),
            eq(schema.providerRateMatrixVersions.providerName, "epost"),
          ),
        );
      await tx
        .update(schema.providerRateMatrixVersions)
        .set({
          status: "active",
          verifiedAt: now,
          effectiveAt: now,
          expiresAt,
          updatedAt: now,
        })
        .where(eq(schema.providerRateMatrixVersions.id, versionId));
    });

    return { versionId, entryCount: entries.length, expiresAt };
  } catch (error) {
    await db
      .update(schema.providerRateMatrixVersions)
      .set({
        status: "failed",
        failureReason: error instanceof Error ? error.message : String(error),
        updatedAt: now,
      })
      .where(eq(schema.providerRateMatrixVersions.id, versionId));

    throw error;
  }
}
