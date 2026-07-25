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

export interface AdminDashboardFunnelStep {
  key: "visits" | "draftsStarted" | "draftsReady" | "checkoutsStarted" | "paid";
  count: number;
  conversionPercent: number | null;
  dropOffPercent: number | null;
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
  /** Product events tracked in our DB; GA4 sessions are a separate source. */
  trackedVisits: AdminDashboardMetric;
  draftsStarted: AdminDashboardMetric;
  draftsReady: AdminDashboardMetric;
  checkoutsStarted: AdminDashboardMetric;
  funnel: AdminDashboardFunnelStep[];
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

// ---------------------------------------------------------------------------
// Financials (P&L) contracts
//
// A live-computed profit & loss waterfall built ONLY from values frozen per
// order at checkout (receipts + payment_attempts.breakdown) plus one manual
// input (monthly fixed opex). All amounts are CHF cents. CM1/CM2 stay labelled
// "estimated" while Stripe fees are estimated (plan §9). VAT output is NOT
// filing-ready until partial refunds / credit notes reconcile.
// ---------------------------------------------------------------------------

/** Financials supports the dashboard windows plus calendar-month and YTD. */
export type AdminFinancialsPeriod = "today" | "7d" | "30d" | "month" | "ytd";

/** A single line of the P&L waterfall (positive = income, negative = cost). */
export interface AdminPnlLine {
  key: string;
  label: string;
  amountCents: number;
  /** How to render the line. */
  kind: "revenue" | "cost" | "subtotal" | "result";
  /** True when the amount is an estimate (e.g. Stripe fees) rather than actual. */
  estimated?: boolean;
  /** True when the value is unknown/unset (e.g. fixed opex not entered). */
  unset?: boolean;
  /** Optional inline note, e.g. "no campaigns yet". */
  note?: string;
}

export interface AdminPnlWaterfall {
  grossRevenueCents: number;
  vatCents: number;
  netRevenueCents: number;
  refundsCents: number;
  netAfterRefundsCents: number;
  postageCostCents: number;
  paymentFeesCents: number;
  paymentFeesEstimated: boolean;
  contributionCm1Cents: number;
  contributionEstimated: boolean;
  adSpendCents: number;
  /** "stub" until real Google Ads spend is wired. */
  adSpendSource: "stub" | "actual";
  contributionCm2Cents: number;
  /** Manual monthly fixed opex for the period, or null when unset. */
  fixedOpexCents: number | null;
  /** cm2 − fixedOpex, or null when opex is unset. */
  operatingResultCents: number | null;
  /** Ordered lines for a step table / waterfall render. */
  lines: AdminPnlLine[];
}

export interface AdminFinancialsDeliveryRow {
  deliveryType: "standard" | "registered";
  orders: number;
  grossCents: number;
  contributionCents: number;
}

/** Service (what episto keeps) vs Swiss Post postage (pass-through). */
export interface AdminFinancialsComponentSplit {
  serviceMarkupCents: number;
  postageCents: number;
}

export interface AdminFinancialsPricingRow {
  segment: "full_price" | "promo" | "free";
  orders: number;
  grossCents: number;
  contributionCents: number;
}

export interface AdminFinancialsVatRow {
  /** VAT rate in basis points (810 = 8.1%). */
  rateBp: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
}

export interface AdminFinancialsVatSummary {
  rows: AdminFinancialsVatRow[];
  /** VAT already collected, net of refunds' VAT share. */
  collectedCents: number;
  /** Estimated VAT reversed via refunds (VAT share of refunded amounts). */
  refundedVatCents: number;
  netCents: number;
}

export interface AdminFinancialsTrendPoint {
  /** ISO date (YYYY-MM-DD) or ISO week label, Europe/Zurich. */
  date: string;
  netRevenueCents: number;
  contributionCents: number;
  /** Operating result for the bucket, or null when fixed opex is unset. */
  operatingResultCents: number | null;
}

export interface AdminFinancialsResponse {
  period: AdminFinancialsPeriod;
  yearMonth: string;
  pnl: AdminPnlWaterfall;
  byDelivery: AdminFinancialsDeliveryRow[];
  componentSplit: AdminFinancialsComponentSplit;
  byPricing: AdminFinancialsPricingRow[];
  vat: AdminFinancialsVatSummary;
  trend: AdminFinancialsTrendPoint[];
  /** Bucket granularity of the trend series. */
  trendGranularity: "day" | "week";
  generatedAt: string;
}

export interface AdminFixedCostsResponse {
  yearMonth: string;
  amountCents: number | null;
  note: string | null;
  updatedAt: string | null;
}

export interface AdminFixedCostsInput {
  /** Target month "YYYY-MM"; defaults server-side to the current month. */
  yearMonth?: string;
  amountCents: number;
  note?: string | null;
}
