import type { DispatchStatusLookup, DispatchSubmitResult } from "@swiss-mail/shared";
import type { JsonRecord } from "./epost-types.js";

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

export function mapStatusLookup(status: unknown): DispatchStatusLookup["state"] {
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
