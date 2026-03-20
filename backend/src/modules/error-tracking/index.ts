/**
 * Error tracking — structured error capture for backend services.
 *
 * Follows the same replaceable-sink pattern as the analytics module
 * (see modules/analytics/index.ts). MVP sink writes to structured logs
 * (Pino). Replace with a vendor SDK (e.g. Sentry) when available.
 *
 * Privacy rules (from analytics-and-observability.md §3):
 * - Never include letter content, names, addresses, or tokens
 * - Only include error family, message, request ID, route, and stack trace
 */

import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("error-tracking");

// ---------------------------------------------------------------------------
// Error context — metadata attached to each captured error
// ---------------------------------------------------------------------------

export interface ErrorContext {
  /** Canonical error family from shared/errors.ts */
  errorFamily?: string;
  /** Opaque request ID for correlation */
  requestId?: string;
  /** Route that triggered the error */
  route?: string;
  /** HTTP method */
  method?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Additional safe metadata (no PII) */
  extra?: Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------------------
// Sink interface — allows swapping the error tracking backend
// ---------------------------------------------------------------------------

export interface ErrorTrackingSink {
  captureError(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level: "warning" | "error", context?: ErrorContext): void;
}

// ---------------------------------------------------------------------------
// Default sink — structured log output (MVP)
// ---------------------------------------------------------------------------

const logSink: ErrorTrackingSink = {
  captureError(error: Error, context?: ErrorContext): void {
    logger.error(
      {
        err: error,
        errorFamily: context?.errorFamily,
        requestId: context?.requestId,
        route: context?.route,
        method: context?.method,
        statusCode: context?.statusCode,
        ...context?.extra,
      },
      `error-tracking: ${error.message}`,
    );
  },

  captureMessage(message: string, level: "warning" | "error", context?: ErrorContext): void {
    const fields = {
      errorFamily: context?.errorFamily,
      requestId: context?.requestId,
      route: context?.route,
      method: context?.method,
      statusCode: context?.statusCode,
      ...context?.extra,
    };
    if (level === "warning") {
      logger.warn(fields, `error-tracking: ${message}`);
    } else {
      logger.error(fields, `error-tracking: ${message}`);
    }
  },
};

// ---------------------------------------------------------------------------
// Active sink — singleton, replaceable for vendor swap or testing
// ---------------------------------------------------------------------------

let _sink: ErrorTrackingSink = logSink;

export function setErrorTrackingSink(sink: ErrorTrackingSink): void {
  _sink = sink;
}

export function resetErrorTrackingSink(): void {
  _sink = logSink;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Capture an error for tracking and alerting.
 * Fire-and-forget — never throws or blocks the request.
 */
export function captureError(error: Error, context?: ErrorContext): void {
  try {
    _sink.captureError(error, context);
  } catch {
    // Error tracking must never crash the application
    logger.warn({ originalError: error.message }, "Failed to capture error for tracking");
  }
}

/**
 * Capture a warning or error message without an Error object.
 * Fire-and-forget — never throws or blocks the request.
 */
export function captureMessage(
  message: string,
  level: "warning" | "error" = "error",
  context?: ErrorContext,
): void {
  try {
    _sink.captureMessage(message, level, context);
  } catch {
    // Error tracking must never crash the application
    logger.warn({ originalMessage: message }, "Failed to capture message for tracking");
  }
}
