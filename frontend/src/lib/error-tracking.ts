import { loadSentry, type SentryModule } from "./sentry-client";
import {
  hasFrontendSentryDsn,
  sanitizeObservabilityMetadata,
  sanitizeObservabilityPath,
} from "./sentry-config";

export interface FrontendErrorContext {
  errorFamily?: string;
  route?: string | undefined;
  component?: string;
  extra?: Record<string, string | number | boolean>;
}

export type FrontendMessageLevel = "warning" | "error";

function createSafeError(error: Error): Error {
  const safeError = new Error(error.message);
  safeError.name = error.name;
  if (error.stack) {
    safeError.stack = error.stack;
  }
  return safeError;
}

function withErrorTrackingScope(
  context: FrontendErrorContext | undefined,
  callback: (Sentry: SentryModule) => void,
): void {
  if (!hasFrontendSentryDsn()) {
    return;
  }

  void loadSentry()
    .then((Sentry) => {
      if (Sentry) withScopeLoaded(Sentry, context, callback);
    })
    .catch(() => {
      // Error tracking must never break the UI.
    });
}

function withScopeLoaded(
  Sentry: SentryModule,
  context: FrontendErrorContext | undefined,
  callback: (Sentry: SentryModule) => void,
): void {
  Sentry.withScope((scope) => {
    if (context?.component) {
      scope.setTag("component", context.component);
    }
    if (context?.route) {
      scope.setTag("route", sanitizeObservabilityPath(context.route));
    }
    if (context?.errorFamily) {
      scope.setTag("error_family", context.errorFamily);
    }
    if (context?.extra) {
      scope.setContext("safe_metadata", sanitizeObservabilityMetadata(context.extra));
    }

    callback(Sentry);
  });
}

export function captureException(error: Error, context?: FrontendErrorContext): void {
  try {
    withErrorTrackingScope(context, (Sentry) => {
      Sentry.captureException(createSafeError(error));
    });
  } catch {
    // Error tracking must never break the UI.
  }
}

export function captureMessage(
  message: string,
  level: FrontendMessageLevel = "error",
  context?: FrontendErrorContext,
): void {
  try {
    withErrorTrackingScope(context, (Sentry) => {
      Sentry.captureMessage(message, level);
    });
  } catch {
    // Error tracking must never break the UI.
  }
}
