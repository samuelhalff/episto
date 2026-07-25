// Admin analytics dashboard ("Pulse") contracts.
// Split out of contracts/index.ts to respect the file-size guard.

// ---------------------------------------------------------------------------
// Admin analytics dashboard ("Pulse") contracts
//
// DB-only, live-computed. Money is always CHF cents. Deltas are suppressed
// below AdminDashboardMetric.lowVolume — never headline unstable rates on
// single/low-digit volumes (plan §9).
// ---------------------------------------------------------------------------

export type AdminDashboardPeriod = "today" | "7d" | "30d";

export interface AdminDashboardMetric {
  /** Current-period value. Cents for money metrics, count for counts. */
  value: number;
  /** Previous equal-length period value, for comparison. */
  previousValue: number;
  /**
   * Percentage delta vs the previous period (rounded to 0.1), or null when the
   * sample is too small to be meaningful (lowVolume) or the base was zero.
   */
  deltaPercent: number | null;
  /** True when the combined sample is below the low-volume threshold. */
  lowVolume: boolean;
}

export interface AdminDashboardDailyPoint {
  /** ISO date (YYYY-MM-DD) in Europe/Zurich. */
  date: string;
  orders: number;
  netRevenueCents: number;
}

export interface AdminDashboardDeliveryMix {
  standard: number;
  registered: number;
}

export interface AdminDashboardAlerts {
  /** Payments awaiting refund action (current-state, ignores period). */
  refundsPending: number;
  /** Dispatch attempts in rejected/unknown state (current-state). */
  dispatchProblems: number;
  /** Support events recorded in the last 24h (current-state). */
  newFeedback24h: number;
}

export interface AdminDashboardResponse {
  period: AdminDashboardPeriod;
  /** True when the current period sample is below the low-volume threshold. */
  lowVolume: boolean;
  lowVolumeThreshold: number;
  lettersPaid: AdminDashboardMetric;
  /** Estimated CM1 contribution in cents. */
  contributionCents: AdminDashboardMetric;
  /** True when any captured order in the period used an estimated Stripe fee. */
  contributionEstimated: boolean;
  netRevenueCents: AdminDashboardMetric;
  vatCents: number;
  dispatchSuccessRate: AdminDashboardMetric;
  dailySeries: AdminDashboardDailyPoint[];
  deliveryMix: AdminDashboardDeliveryMix;
  alerts: AdminDashboardAlerts;
  lastUpdated: string;
}

export type AdminPaymentState =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "refund_pending"
  | "refunded"
  | "partially_refunded";

export type AdminDispatchState =
  | "queued"
  | "submitted"
  | "accepted"
  | "rejected"
  | "unknown"
  | "reconciled";

export interface AdminLetterRow {
  /** Short, non-PII reference: order ref or short draft id. */
  ref: string;
  createdAt: string;
  locale: string | null;
  deliveryType: string | null;
  amountCents: number;
  paymentState: AdminPaymentState;
  dispatchState: AdminDispatchState | null;
  trackingNumber: string | null;
}

export interface AdminLettersResponse {
  rows: AdminLetterRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  generatedAt: string;
}

export interface AdminMoneyPromoRow {
  code: string;
  redemptions: number;
  discountCents: number;
  attributedPaidLetters: number;
}

export interface AdminMoneyRefundRow {
  ref: string;
  amountCents: number;
  date: string;
  reason: string | null;
  draftId: string;
}

export interface AdminMoneyResponse {
  period: AdminDashboardPeriod;
  grossCents: number;
  netCents: number;
  vatCents: number;
  discountCents: number;
  refundsCents: number;
  promos: AdminMoneyPromoRow[];
  refunds: AdminMoneyRefundRow[];
  generatedAt: string;
}

export interface AdminFeedbackRow {
  id: string;
  date: string;
  locale: string | null;
  draftId: string | null;
  eventType: string;
  excerpt: string;
  actor: string;
}

export interface AdminFeedbackResponse {
  rows: AdminFeedbackRow[];
  total: number;
  generatedAt: string;
}

export interface AdminRefundRow {
  ref: string;
  draftId: string;
  amountCents: number;
  state: "refund_pending" | "refunded" | "partially_refunded";
  reason: string | null;
  date: string;
}

export interface AdminRefundsResponse {
  rows: AdminRefundRow[];
  total: number;
  generatedAt: string;
}
