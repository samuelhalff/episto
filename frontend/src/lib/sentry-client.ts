import type * as SentryNamespace from "@sentry/nextjs";
import { createSentryInitOptions, getFrontendSentryDsn } from "./sentry-config";

export type SentryModule = typeof SentryNamespace;

let pending: Promise<SentryModule | null> | null = null;

/**
 * Loads and initialises the browser Sentry SDK once, on demand.
 *
 * The SDK is a large chunk, so it is kept off the critical path: it is pulled
 * in after first paint (see `instrumentation-client.ts`) or the first time an
 * error or router transition needs it, whichever comes first.
 */
export function loadSentry(): Promise<SentryModule | null> {
  if (pending) return pending;
  const dsn = getFrontendSentryDsn();
  if (!dsn) {
    pending = Promise.resolve(null);
    return pending;
  }
  pending = import("@sentry/nextjs").then((Sentry) => {
    Sentry.init(createSentryInitOptions(dsn));
    return Sentry;
  });
  return pending;
}
