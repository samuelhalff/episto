import { createHash } from "node:crypto";

import {
  DispatchStatusLookupSchema,
  DispatchSubmitResultSchema,
  type DispatchPackage,
  type DispatchStatusLookup,
  type DispatchSubmitResult,
} from "@swiss-mail/shared";

const MOCK_PROVIDER_REFERENCE_PREFIX = "mock-epost";

function buildReferenceSeed(dispatchPackage: DispatchPackage): string {
  return `${dispatchPackage.draftId}:${dispatchPackage.snapshotId}:${dispatchPackage.deliveryType}`;
}

function buildReferenceDigest(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 12);
}

function buildMockTrackingNumber(providerReference: string): string | null {
  if (!providerReference.startsWith(`${MOCK_PROVIDER_REFERENCE_PREFIX}-registered-`)) {
    return null;
  }

  const digits = providerReference.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);
  return `98.40.${digits.slice(0, 6)}.${digits.slice(6, 14)}`;
}

export function isMockEpostProviderReference(providerReference: string): boolean {
  return providerReference.startsWith(`${MOCK_PROVIDER_REFERENCE_PREFIX}-`);
}

export function buildMockEpostProviderReference(
  dispatchPackage: DispatchPackage,
): string {
  return [
    MOCK_PROVIDER_REFERENCE_PREFIX,
    dispatchPackage.deliveryType,
    buildReferenceDigest(buildReferenceSeed(dispatchPackage)),
  ].join("-");
}

export function submitMockEpostDelivery(
  dispatchPackage: DispatchPackage,
): DispatchSubmitResult {
  const providerReference = buildMockEpostProviderReference(dispatchPackage);

  return DispatchSubmitResultSchema.parse({
    state: "accepted",
    providerReference,
    trackingNumber: buildMockTrackingNumber(providerReference),
    failureReason: null,
  });
}

export function lookupMockEpostStatus(
  providerReference: string,
): DispatchStatusLookup {
  return DispatchStatusLookupSchema.parse({
    state: "accepted",
    providerReference,
    trackingNumber: buildMockTrackingNumber(providerReference),
    failureReason: null,
    checkedAt: new Date(),
  });
}
