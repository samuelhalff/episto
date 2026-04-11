import type { ErrorEvent } from "@sentry/nextjs";
import { env } from "./env";

const FRONTEND_TRACES_SAMPLE_RATE = 0.1;

export function getFrontendSentryDsn(): string | null {
  return env.NEXT_PUBLIC_SENTRY_DSN ?? null;
}

export function getServerSentryDsn(): string | null {
  return process.env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN ?? null;
}

export function hasFrontendSentryDsn(): boolean {
  return getFrontendSentryDsn() !== null;
}

function stripSentryPii(event: ErrorEvent): ErrorEvent {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
  }

  return event;
}

export function createSentryInitOptions(dsn: string) {
  return {
    dsn,
    environment: env.NEXT_PUBLIC_APP_ENV,
    sendDefaultPii: false,
    tracesSampleRate: FRONTEND_TRACES_SAMPLE_RATE,
    beforeSend: stripSentryPii,
  };
}
