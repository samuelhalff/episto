/**
 * Product analytics — privacy-safe event recording for the frontend.
 *
 * Implements the client-side events from the taxonomy in
 * docs/07-operations/analytics-and-observability.md §4.
 *
 * Privacy rules (§3): never include letter content, names, addresses,
 * or tokens. Only opaque IDs, locale, route, event name, timestamps,
 * durations, and counts.
 *
 * MVP sink: structured console output. Replace with a privacy-first
 * vendor SDK (e.g. PostHog, Plausible) when available.
 */

// ---------------------------------------------------------------------------
// Event types — client-side events from taxonomy §4.1–4.3
// ---------------------------------------------------------------------------

export type FrontendAnalyticsEvent =
  // §4.1 Marketing and entry
  | { event: "marketing_page_viewed"; route: string; locale: string; source: string }
  | { event: "draft_entry_started"; locale: string; source: string }
  | { event: "template_selected"; templateSlug: string; locale: string }
  // §4.2 Session and draft flow (client-side subset)
  | { event: "resume_banner_shown"; sessionId: string }
  | { event: "draft_conflict_seen"; draftId: string; surface: string }
  // §4.3 Files and review
  | { event: "file_upload_started"; draftId: string; kind: string; countExisting: number }
  | { event: "file_upload_failed"; draftId: string; kind: string; errorFamily: string }
  | { event: "review_blocked"; draftId: string; reason: string }
  // §4.4 Checkout
  | { event: "checkout_started"; draftId: string; deliveryType: string; priceCents: number };

// ---------------------------------------------------------------------------
// Sink interface — allows swapping analytics backend
// ---------------------------------------------------------------------------

export interface FrontendAnalyticsSink {
  record(event: FrontendAnalyticsEvent): void;
}

// ---------------------------------------------------------------------------
// Default sink — structured console (MVP)
// ---------------------------------------------------------------------------

const consoleSink: FrontendAnalyticsSink = {
  record(event: FrontendAnalyticsEvent): void {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      const { event: name, ...fields } = event;
      console.info(`[analytics] ${name}`, fields);
    }
  },
};

// ---------------------------------------------------------------------------
// Active sink — replaceable for vendor integration or testing
// ---------------------------------------------------------------------------

let _sink: FrontendAnalyticsSink = consoleSink;

export function setFrontendAnalyticsSink(sink: FrontendAnalyticsSink): void {
  _sink = sink;
}

export function resetFrontendAnalyticsSink(): void {
  _sink = consoleSink;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a frontend product analytics event.
 * Fire-and-forget — never throws or interrupts the user.
 */
export function trackEvent(event: FrontendAnalyticsEvent): void {
  try {
    _sink.record(event);
  } catch {
    // Analytics must never break the UI
  }
}
