/**
 * Error tracking — structured error capture for the frontend.
 *
 * Follows the same replaceable-sink pattern as the analytics module
 * (see lib/analytics.ts). MVP sink writes to console.error.
 * Replace with a vendor SDK (e.g. Sentry) when available.
 *
 * Privacy rules (from analytics-and-observability.md §3):
 * - Never include letter content, names, addresses, or tokens
 * - Only include error family, message, route, and component name
 */

// ---------------------------------------------------------------------------
// Error context — metadata attached to each captured error
// ---------------------------------------------------------------------------

export interface FrontendErrorContext {
  /** Canonical error family */
  errorFamily?: string;
  /** Route where error occurred */
  route?: string | undefined;
  /** Component name */
  component?: string;
  /** Additional safe metadata (no PII) */
  extra?: Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------------------
// Sink interface — allows swapping the error tracking backend
// ---------------------------------------------------------------------------

export interface FrontendErrorTrackingSink {
  captureError(error: Error, context?: FrontendErrorContext): void;
  captureMessage(message: string, level: "warning" | "error", context?: FrontendErrorContext): void;
}

// ---------------------------------------------------------------------------
// Default sink — console output (MVP)
// ---------------------------------------------------------------------------

const consoleSink: FrontendErrorTrackingSink = {
  captureError(error: Error, context?: FrontendErrorContext): void {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      console.error("[error-tracking]", error.message, context ?? {});
    }
  },

  captureMessage(
    message: string,
    level: "warning" | "error",
    context?: FrontendErrorContext,
  ): void {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
      const log = level === "warning" ? console.warn : console.error;
      log("[error-tracking]", message, context ?? {});
    }
  },
};

// ---------------------------------------------------------------------------
// Active sink — replaceable for vendor integration or testing
// ---------------------------------------------------------------------------

let _sink: FrontendErrorTrackingSink = consoleSink;

export function setFrontendErrorTrackingSink(sink: FrontendErrorTrackingSink): void {
  _sink = sink;
}

export function resetFrontendErrorTrackingSink(): void {
  _sink = consoleSink;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Capture an error for frontend error tracking.
 * Fire-and-forget — never throws or interrupts the user.
 */
export function captureError(error: Error, context?: FrontendErrorContext): void {
  try {
    _sink.captureError(error, context);
  } catch {
    // Error tracking must never break the UI
  }
}

/**
 * Capture a warning or error message without an Error object.
 * Fire-and-forget — never throws or interrupts the user.
 */
export function captureMessage(
  message: string,
  level: "warning" | "error" = "error",
  context?: FrontendErrorContext,
): void {
  try {
    _sink.captureMessage(message, level, context);
  } catch {
    // Error tracking must never break the UI
  }
}
