import * as Sentry from "@sentry/nextjs";
import { hasFrontendSentryDsn } from "./sentry-config";

export interface FrontendErrorContext {
  errorFamily?: string;
  route?: string | undefined;
  component?: string;
  extra?: Record<string, string | number | boolean>;
}

export type FrontendMessageLevel = "warning" | "error";

function withErrorTrackingScope(
  context: FrontendErrorContext | undefined,
  callback: () => void,
): void {
  if (!hasFrontendSentryDsn()) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.component) {
      scope.setTag("component", context.component);
    }
    if (context?.route) {
      scope.setTag("route", context.route);
    }
    if (context?.errorFamily) {
      scope.setTag("error_family", context.errorFamily);
    }
    if (context?.extra) {
      scope.setContext("safe_metadata", context.extra);
    }

    callback();
  });
}

export function captureException(error: Error, context?: FrontendErrorContext): void {
  try {
    withErrorTrackingScope(context, () => {
      Sentry.captureException(error);
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
    withErrorTrackingScope(context, () => {
      Sentry.captureMessage(message, level);
    });
  } catch {
    // Error tracking must never break the UI.
  }
}
