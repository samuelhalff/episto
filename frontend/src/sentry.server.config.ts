import * as Sentry from "@sentry/nextjs";
import { createSentryInitOptions, getServerSentryDsn } from "./lib/sentry-config";

const sentryDsn = getServerSentryDsn();

if (sentryDsn) {
  Sentry.init(createSentryInitOptions(sentryDsn));
}
