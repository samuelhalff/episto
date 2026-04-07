/**
 * Product analytics event recorder.
 *
 * Implements the event taxonomy from docs/07-operations/analytics-and-observability.md §4.
 * Events are recorded to structured logs (Pino) for MVP. A dedicated analytics vendor
 * can be wired in later by replacing the sink without changing call sites.
 *
 * Privacy rules (from analytics-and-observability.md §3):
 * - Never include letter subject, body, names, addresses, or tokens
 * - Only opaque IDs, locale, route, event name, timestamps, durations, states, counts
 */

import { createLogger } from "../../shared/logging/index.js";
import { CompositeSink } from "./composite-sink.js";
import { DbSink } from "./db-sink.js";

const logger = createLogger("analytics");

// ---------------------------------------------------------------------------
// Event type definitions — matches §4 taxonomy exactly
// ---------------------------------------------------------------------------

export type AnalyticsEvent =
  // §4.1 Marketing and entry
  | { event: "marketing_page_viewed"; route: string; locale: string; source: string }
  | { event: "draft_entry_started"; locale: string; source: string }
  | { event: "template_selected"; templateSlug: string; locale: string }
  // §4.2 Session and draft flow
  | { event: "session_created"; sessionId: string; locale: string }
  | { event: "resume_banner_shown"; sessionId: string }
  | { event: "resume_link_opened"; sessionId: string; result: string }
  | { event: "draft_created"; sessionId: string; draftId: string }
  | { event: "draft_first_response_completed"; draftId: string; durationMs: number }
  | { event: "draft_first_full_draft_ready"; draftId: string; durationMs: number; pageCountEstimate: number }
  | { event: "draft_conflict_seen"; draftId: string; surface: string }
  // §4.3 Files and review
  | { event: "file_upload_started"; draftId: string; kind: string; countExisting: number }
  | { event: "file_upload_failed"; draftId: string; kind: string; errorFamily: string }
  | { event: "review_reached"; draftId: string; pageCountEstimate: number; attachmentCount: number }
  | { event: "review_blocked"; draftId: string; reason: string }
  // §4.4 Checkout and payment
  | { event: "checkout_started"; draftId: string; deliveryType: string; priceCents: number }
  | { event: "payment_intent_created"; draftId: string; paymentAttemptId: string }
  | { event: "payment_failed"; draftId: string; paymentAttemptId: string; errorFamily: string }
  | { event: "payment_captured"; draftId: string; paymentAttemptId: string; amountCents: number }
  // §4.5 Dispatch and post-payment
  | { event: "dispatch_submitted"; draftId: string; dispatchAttemptId: string; deliveryType: string }
  | { event: "dispatch_accepted"; draftId: string; dispatchAttemptId: string }
  | { event: "dispatch_ambiguous"; draftId: string; dispatchAttemptId: string; reasonCategory: string }
  | { event: "order_status_viewed"; draftId: string; dispatchState: string }
  | { event: "refund_confirmed"; draftId: string; paymentAttemptId: string; amountCents: number }
  // §4.6 Rendering
  | { event: "render_completed"; draftId: string; durationMs: number }
  | { event: "render_failed"; draftId: string; errorFamily: string }
  // §4.7 Page and feature tracking (supplementary)
  | { event: "page_viewed"; route: string; locale: string; sessionId?: string }
  | { event: "feature_used"; surface: string; locale: string; sessionId?: string }
  // §4.8 AI quality
  | { event: "ai_generation_requested"; draftId: string; locale: string }
  | { event: "ai_generation_completed"; draftId: string; durationMs: number; wasRefusal: boolean };

// ---------------------------------------------------------------------------
// Event name constants — for type-safe usage at call sites
// ---------------------------------------------------------------------------

export const ANALYTICS_EVENTS = {
  // Marketing
  MARKETING_PAGE_VIEWED: "marketing_page_viewed",
  DRAFT_ENTRY_STARTED: "draft_entry_started",
  TEMPLATE_SELECTED: "template_selected",
  // Session & draft
  SESSION_CREATED: "session_created",
  RESUME_BANNER_SHOWN: "resume_banner_shown",
  RESUME_LINK_OPENED: "resume_link_opened",
  DRAFT_CREATED: "draft_created",
  DRAFT_FIRST_RESPONSE_COMPLETED: "draft_first_response_completed",
  DRAFT_FIRST_FULL_DRAFT_READY: "draft_first_full_draft_ready",
  DRAFT_CONFLICT_SEEN: "draft_conflict_seen",
  // Files & review
  FILE_UPLOAD_STARTED: "file_upload_started",
  FILE_UPLOAD_FAILED: "file_upload_failed",
  REVIEW_REACHED: "review_reached",
  REVIEW_BLOCKED: "review_blocked",
  // Checkout & payment
  CHECKOUT_STARTED: "checkout_started",
  PAYMENT_INTENT_CREATED: "payment_intent_created",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_CAPTURED: "payment_captured",
  // Dispatch & post-payment
  DISPATCH_SUBMITTED: "dispatch_submitted",
  DISPATCH_ACCEPTED: "dispatch_accepted",
  DISPATCH_AMBIGUOUS: "dispatch_ambiguous",
  ORDER_STATUS_VIEWED: "order_status_viewed",
  REFUND_CONFIRMED: "refund_confirmed",
  // Rendering
  RENDER_COMPLETED: "render_completed",
  RENDER_FAILED: "render_failed",
  // Page & feature
  PAGE_VIEWED: "page_viewed",
  FEATURE_USED: "feature_used",
  // AI quality
  AI_GENERATION_REQUESTED: "ai_generation_requested",
  AI_GENERATION_COMPLETED: "ai_generation_completed",
} as const;

// ---------------------------------------------------------------------------
// Sink interface — allows swapping the analytics backend
// ---------------------------------------------------------------------------

export interface AnalyticsSink {
  record(event: AnalyticsEvent): void;
}

// ---------------------------------------------------------------------------
// Default sink — structured log output (MVP)
// ---------------------------------------------------------------------------

const logSink: AnalyticsSink = {
  record(event: AnalyticsEvent): void {
    const { event: name, ...fields } = event;
    logger.info({ analyticsEvent: name, ...fields }, `analytics: ${name}`);
  },
};

// ---------------------------------------------------------------------------
// Active sink — composite by default (log + DB), replaceable for testing
// ---------------------------------------------------------------------------

const defaultSink: AnalyticsSink = new CompositeSink([logSink, new DbSink()]);
let _sink: AnalyticsSink = defaultSink;

export function setAnalyticsSink(sink: AnalyticsSink): void {
  _sink = sink;
}

export function resetAnalyticsSink(): void {
  _sink = defaultSink;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a product analytics event.
 * Fire-and-forget — never throws, never blocks the request.
 */
export function recordEvent(event: AnalyticsEvent): void {
  try {
    _sink.record(event);
  } catch {
    // Analytics must never crash the application
    logger.warn({ event: event.event }, "Failed to record analytics event");
  }
}
