import { sql } from "drizzle-orm";
import { computeOrderContributionCents } from "../payments/order-economics.js";
import type {
  AdminDashboardMetric,
  AdminDashboardPeriod,
  AdminPaymentState,
  AdminDispatchState,
} from "@episto/shared";

// ---------------------------------------------------------------------------
// Time & period semantics (plan §9)
//
// All period windows are half-open [from, to) anchored to "now". "today" = the
// trailing 24h, "7d"/"30d" = trailing N days. Comparison periods are the equal
// window immediately preceding. Reporting is by event timestamp: letters paid
// by capture time (payment_attempts.updated_at on captured rows), refunds by
// refund time. Day bucketing for the daily series uses Europe/Zurich.
// ---------------------------------------------------------------------------

export const DASHBOARD_TIMEZONE = "Europe/Zurich";

/**
 * Below this combined (current + previous) sample size, deltas/rates are
 * suppressed and only absolute counts are shown. Keeps single-digit weeks from
 * emitting wild percentages (plan §9).
 */
export const LOW_VOLUME_THRESHOLD = 20;

export function parseDashboardPeriod(period: string | undefined): AdminDashboardPeriod {
  switch (period) {
    case "today":
      return "today";
    case "30d":
      return "30d";
    case "7d":
    default:
      return "7d";
  }
}

export function periodDays(period: AdminDashboardPeriod): number {
  switch (period) {
    case "today":
      return 1;
    case "30d":
      return 30;
    case "7d":
    default:
      return 7;
  }
}

/**
 * Build a comparison metric. `deltaPercent` is null when the sample is too
 * small (lowVolume) or the previous base was zero (no meaningful ratio).
 */
export function buildMetric(
  value: number,
  previousValue: number,
  lowVolume: boolean,
): AdminDashboardMetric {
  const deltaPercent =
    lowVolume || previousValue === 0
      ? null
      : Math.round(((value - previousValue) / previousValue) * 1000) / 10;
  return { value, previousValue, deltaPercent, lowVolume };
}

/**
 * Dispatch success rate over a set of attempts, expressed as a percentage.
 * Numerator: accepted + reconciled. Denominator: all attempts that have left
 * the queue (i.e. excluding 'queued'). Returns null when there is nothing to
 * rate yet, so the UI can show "—" instead of a fake 0%.
 */
export function dispatchSuccessRate(counts: {
  accepted: number;
  reconciled: number;
  rejected: number;
  unknown: number;
  submitted: number;
}): number | null {
  const denominator =
    counts.accepted +
    counts.reconciled +
    counts.rejected +
    counts.unknown +
    counts.submitted;
  if (denominator === 0) return null;
  return Math.round(((counts.accepted + counts.reconciled) / denominator) * 1000) / 10;
}

export const BREAKDOWN_TOTAL_SQL = sql`COALESCE((breakdown->>'totalCents')::int, amount_cents)`;
export const BREAKDOWN_PROVIDER_SQL = sql`COALESCE((breakdown->>'providerQuotedCents')::int, 0)`;

export interface CapturedOrderRow extends Record<string, unknown> {
  total_cents: number;
  provider_quoted_cents: number;
}

/**
 * Sum estimated CM1 contribution over captured orders using the frozen
 * per-order breakdown (providerQuotedCents + totalCents). Actual Stripe fees
 * are not yet persisted, so every order falls back to the estimate — hence the
 * `estimated` flag is true whenever any order contributes.
 */
export function sumContributionCents(rows: CapturedOrderRow[]): {
  contributionCents: number;
  estimated: boolean;
} {
  let contributionCents = 0;
  let estimated = false;
  for (const row of rows) {
    const cm = computeOrderContributionCents({
      totalCents: Number(row.total_cents ?? 0),
      providerQuotedCents: Number(row.provider_quoted_cents ?? 0),
      // actualStripeFeeCents intentionally omitted — not persisted yet.
    });
    contributionCents += cm.contributionCents;
    if (cm.feeEstimated) estimated = true;
  }
  return { contributionCents, estimated };
}

// ---------------------------------------------------------------------------
// CSV hardening (spreadsheet formula injection — plan §9)
// ---------------------------------------------------------------------------

type CsvValue = string | number | null | undefined;

/**
 * Prefix a single quote on any cell whose text begins with a formula trigger
 * (= + - @) so spreadsheets treat it as text, then CSV-escape. Applied to
 * every cell, not just suspicious ones.
 */
export function hardenCsvCell(value: CsvValue): string {
  let normalized = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  if (/["\n,]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function serializeHardenedCsv<T extends object>(
  rows: T[],
  columns: readonly (keyof T & string)[],
): string {
  const header = columns.join(",");
  const body = rows.map((row) => {
    const record = row as Record<string, CsvValue>;
    return columns.map((col) => hardenCsvCell(record[col])).join(",");
  });
  return [header, ...body].join("\n");
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

export function num(v: unknown): number {
  return Number(v ?? 0);
}

export function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

export function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export const PAYMENT_STATES: readonly AdminPaymentState[] = [
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "refund_pending",
  "refunded",
  "partially_refunded",
];
export const DISPATCH_STATES: readonly AdminDispatchState[] = [
  "queued",
  "submitted",
  "accepted",
  "rejected",
  "unknown",
  "reconciled",
];
export const DELIVERY_TYPES = ["standard", "registered"] as const;
