import type {
  AdminDashboardMetric,
  AdminPaymentState,
  AdminDispatchState,
} from "@episto/shared";

/** CHF cents → "CHF 4.55". */
export function formatChf(cents: number): string {
  return `CHF ${(cents / 100).toLocaleString("en-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** CHF cents → whole-franc number for chart axes. */
export function toChf(cents: number): number {
  return Math.round((cents / 100) * 100) / 100;
}

/** A signed percentage string, or null when the delta is suppressed. */
export function formatDelta(metric: AdminDashboardMetric): string | null {
  if (metric.deltaPercent == null) return null;
  const sign = metric.deltaPercent > 0 ? "+" : "";
  return `${sign}${metric.deltaPercent}%`;
}

/**
 * Sub-label for a KPI card: shows the Δ when meaningful, otherwise falls back to
 * the absolute previous value so tiny samples read honestly (plan §9).
 */
export function metricSubLabel(
  metric: AdminDashboardMetric,
  formatValue: (v: number) => string,
): string {
  const delta = formatDelta(metric);
  if (delta) return `${delta} vs prev · was ${formatValue(metric.previousValue)}`;
  if (metric.lowVolume) return "low volume — Δ hidden";
  return `prev ${formatValue(metric.previousValue)}`;
}

export const PAYMENT_STATE_TONE: Record<
  AdminPaymentState,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  pending: "neutral",
  authorized: "info",
  captured: "success",
  failed: "danger",
  cancelled: "neutral",
  refund_pending: "warning",
  refunded: "warning",
  partially_refunded: "warning",
};

export const DISPATCH_STATE_TONE: Record<
  AdminDispatchState,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  queued: "neutral",
  submitted: "info",
  accepted: "success",
  reconciled: "success",
  rejected: "danger",
  unknown: "warning",
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export const PAYMENT_STATE_OPTIONS: AdminPaymentState[] = [
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "refund_pending",
  "refunded",
  "partially_refunded",
];

export const DISPATCH_STATE_OPTIONS: AdminDispatchState[] = [
  "queued",
  "submitted",
  "accepted",
  "rejected",
  "unknown",
  "reconciled",
];

export const DELIVERY_TYPE_OPTIONS = ["standard", "registered"] as const;
