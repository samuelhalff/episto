import type { DispatchStatusLookup, DispatchSubmitResult } from "@episto/shared";
import type { EpostMonitoringMatch, JsonRecord } from "./epost-types.js";

export function extractPhysicalPreviewPrice(preview: JsonRecord): {
  pricePreview: JsonRecord | undefined;
  physicalPrice: JsonRecord | undefined;
  providerQuotedCents: number | null;
} {
  const pricePreview = Array.isArray(preview.pricePreview)
    ? (preview.pricePreview[0] as JsonRecord | undefined)
    : undefined;
  const potentialPrices = Array.isArray(pricePreview?.potentialPrices)
    ? pricePreview.potentialPrices
    : [];
  const physicalPrice = potentialPrices.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      (candidate as JsonRecord).channel === "PHYSICAL",
  ) as JsonRecord | undefined;
  const providerPriceRaw = physicalPrice?.price;

  return {
    pricePreview,
    physicalPrice,
    providerQuotedCents:
      typeof providerPriceRaw === "number" ? Math.round(providerPriceRaw * 100) : null,
  };
}

export function findFirstTrackingNumber(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    "trackingNumber" in value &&
    typeof (value as JsonRecord).trackingNumber === "string"
  ) {
    return (value as JsonRecord).trackingNumber as string;
  }

  for (const nested of Object.values(value as JsonRecord)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const found = findFirstTrackingNumber(item);
        if (found) {
          return found;
        }
      }
      continue;
    }

    const found = findFirstTrackingNumber(nested);
    if (found) {
      return found;
    }
  }

  return null;
}

export function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as JsonRecord;
  for (const key of ["message", "errorMessage", "detail", "error"]) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function extractNestedErrorDetail(
  response: JsonRecord,
): { errorCode: string; errorMessage: string } | null {
  const document = response.document;
  if (!document || typeof document !== "object") return null;

  const failedDocument = (document as JsonRecord).failedDocument;
  if (!Array.isArray(failedDocument)) return null;

  for (const failed of failedDocument) {
    if (!failed || typeof failed !== "object") continue;
    const detail = (failed as JsonRecord).detail;
    if (!Array.isArray(detail)) continue;

    for (const item of detail) {
      if (!item || typeof item !== "object") continue;
      const entry = item as JsonRecord;
      if (
        entry.deliveryChannel === "PHYSICAL" &&
        typeof entry.errorCode === "string" &&
        entry.errorCode.trim()
      ) {
        return {
          errorCode: entry.errorCode,
          errorMessage:
            typeof entry.errorMessage === "string" && entry.errorMessage.trim()
              ? entry.errorMessage
              : entry.errorCode,
        };
      }
    }
  }

  return null;
}

export function findExactMonitoringDelivery(
  value: unknown,
  draftId: string,
  snapshotId: string,
): EpostMonitoringMatch | null {
  if (!Array.isArray(value)) return null;
  const matches = value.filter((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const detail = (candidate as JsonRecord).detail;
    const metadata =
      detail && typeof detail === "object"
        ? (detail as JsonRecord).documentMetadata
        : undefined;
    return Boolean(
      metadata &&
      typeof metadata === "object" &&
      (metadata as JsonRecord).senderCaseId === draftId &&
      (metadata as JsonRecord).senderEndToEndId === snapshotId,
    );
  });

  if (matches.length !== 1) return null;
  const deliveryId = (matches[0] as JsonRecord).deliveryId;
  if (typeof deliveryId !== "string" && typeof deliveryId !== "number") return null;
  return {
    providerReference: String(deliveryId),
    matchedBy: "senderCaseId+senderEndToEndId",
  };
}

export function mapDeliveryStatus(status: unknown): DispatchSubmitResult["state"] {
  switch (status) {
    case "DELIVERED":
      return "accepted";
    case "ERROR":
      return "rejected";
    case "DELIVERED_WITH_ERROR":
      return "accepted";
    case "CREATED":
    case "PROCESSING":
      return "submitted";
    default:
      return "unknown";
  }
}

export function mapStatusLookup(
  statusOrResponse: unknown,
): Pick<DispatchStatusLookup, "state" | "providerErrorCode" | "failureReason"> {
  // Plain string status — backwards-compatible fast path.
  if (typeof statusOrResponse === "string") {
    return {
      state: mapStatusString(statusOrResponse),
      providerErrorCode: null,
      failureReason: null,
    };
  }

  if (!statusOrResponse || typeof statusOrResponse !== "object") {
    return { state: "unknown", providerErrorCode: null, failureReason: null };
  }

  const response = statusOrResponse as JsonRecord;
  const topLevelState = mapStatusString(response.status);
  const nestedError = extractNestedErrorDetail(response);

  if (nestedError) {
    // A PHYSICAL-channel delivery failure means the letter demonstrably did
    // not go out — override the top-level status to rejected.
    return {
      state: "rejected",
      providerErrorCode: nestedError.errorCode,
      failureReason: nestedError.errorMessage,
    };
  }

  return {
    state: topLevelState,
    providerErrorCode: null,
    failureReason: null,
  };
}

function mapStatusString(status: unknown): DispatchStatusLookup["state"] {
  switch (status) {
    case "DELIVERED":
      return "accepted";
    case "ERROR":
      return "rejected";
    case "DELIVERED_WITH_ERROR":
      return "accepted";
    case "CREATED":
    case "PROCESSING":
      return "submitted";
    default:
      return "unknown";
  }
}
