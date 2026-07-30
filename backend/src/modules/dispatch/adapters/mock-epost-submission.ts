import { createHash } from "node:crypto";

import {
  DispatchStatusLookupSchema,
  DispatchSubmitResultSchema,
  type DispatchPackage,
  type DispatchStatusLookup,
  type DispatchSubmitResult,
} from "@episto/shared";

const MOCK_PROVIDER_REFERENCE_PREFIX = "EPR-T";

function buildReferenceSeed(dispatchPackage: DispatchPackage): string {
  return `${dispatchPackage.draftId}:${dispatchPackage.snapshotId}:${dispatchPackage.deliveryType}`;
}

function buildReferenceDigest(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 12);
}

function buildMockTrackingNumber(providerReference: string): string | null {
  if (!providerReference.startsWith(`${MOCK_PROVIDER_REFERENCE_PREFIX}-R-`)) {
    return null;
  }

  const digits = providerReference.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);
  return `98.40.${digits.slice(0, 6)}.${digits.slice(6, 14)}`;
}

export function isMockEpostProviderReference(providerReference: string): boolean {
  return /^EPR-T-[RS]-[A-F0-9]{12}$/.test(providerReference);
}

export function buildMockEpostProviderReference(
  dispatchPackage: DispatchPackage,
): string {
  const deliveryCode = dispatchPackage.deliveryType === "registered" ? "R" : "S";
  return `${MOCK_PROVIDER_REFERENCE_PREFIX}-${deliveryCode}-${buildReferenceDigest(
    buildReferenceSeed(dispatchPackage),
  ).toUpperCase()}`;
}

export function submitMockEpostDelivery(
  dispatchPackage: DispatchPackage,
): DispatchSubmitResult {
  const providerReference = buildMockEpostProviderReference(dispatchPackage);

  return DispatchSubmitResultSchema.parse({
    state: "accepted",
    providerReference,
    trackingNumber: buildMockTrackingNumber(providerReference),
    providerErrorCode: null,
    failureReason: null,
  });
}

export function lookupMockEpostStatus(providerReference: string): DispatchStatusLookup {
  return DispatchStatusLookupSchema.parse({
    state: "accepted",
    providerReference,
    trackingNumber: buildMockTrackingNumber(providerReference),
    providerErrorCode: null,
    failureReason: null,
    checkedAt: new Date(),
  });
}
