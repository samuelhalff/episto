import * as Sentry from "@sentry/nextjs";
import { createSentryInitOptions, getFrontendSentryDsn } from "./lib/sentry-config";

const sentryDsn = getFrontendSentryDsn();

if (sentryDsn) {
  Sentry.init(createSentryInitOptions(sentryDsn));
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
