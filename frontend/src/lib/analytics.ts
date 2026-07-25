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
 * Events are forwarded to Google Analytics 4 (as key events) whenever the
 * visitor has granted analytics consent and gtag is loaded; otherwise they
 * fall back to structured console output only.
 */

import { hasAnalyticsConsent } from "./consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

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
  | {
      event: "checkout_started";
      draftId: string;
      deliveryType: string;
      priceCents: number;
    }
  // §4.4 Purchase — PRIMARY conversion. Fires once when payment is captured.
  // Distinct from letter_dispatched (fulfilment) and any future refund event.
  | {
      event: "payment_succeeded";
      orderRef: string;
      valueCents: number;
      currency: "CHF";
      deliveryType?: string;
      locale: string;
    }
  // §4.5 Dispatch (fulfilment signal, not the purchase conversion)
  | { event: "letter_dispatched"; draftId: string; deliveryType?: string };

// ---------------------------------------------------------------------------
// Sink interface — allows swapping analytics backend
// ---------------------------------------------------------------------------

export interface FrontendAnalyticsSink {
  record(event: FrontendAnalyticsEvent): void;
}

// ---------------------------------------------------------------------------
// Default sink — structured console (MVP)
// ---------------------------------------------------------------------------

function forwardToGoogleAnalytics(event: FrontendAnalyticsEvent): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;

  // The purchase conversion is emitted to GA4 with standard ecommerce
  // semantics so it can be marked a key event and imported into Google Ads.
  // `transaction_id` lets GA4/Ads de-duplicate on reload. `value` is gross
  // revenue in CHF; contribution-based bidding is an Ads-side value rule.
  if (event.event === "payment_succeeded") {
    gtag("event", "purchase", {
      transaction_id: event.orderRef,
      value: event.valueCents / 100,
      currency: event.currency,
      locale: event.locale,
      ...(event.deliveryType ? { delivery_type: event.deliveryType } : {}),
    });
    return;
  }

  const { event: name, ...params } = event;
  gtag("event", name, params);
}

const consoleSink: FrontendAnalyticsSink = {
  record(event: FrontendAnalyticsEvent): void {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      const { event: name, ...fields } = event;
      console.info(`[analytics] ${name}`, fields);
    }
    forwardToGoogleAnalytics(event);
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
