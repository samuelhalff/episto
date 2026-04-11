import type { ErrorEvent, SpanJSON, TransactionEvent } from "@sentry/core";
import { env } from "./env";

const FRONTEND_TRACES_SAMPLE_RATE = 0.1;
const TOKEN_PLACEHOLDER = "[token]";
const TOKENIZED_PATH_PATTERNS = [
  /(\/draft\/)([^/?#]+)/g,
  /(\/admin\/drafts\/)([^/?#]+)/g,
  /(\/resume\/)([^/?#]+)/g,
  /(\/status\/)([^/?#]+)/g,
  /(\/v1\/drafts\/)([^/?#]+)/g,
  /(\/v1\/resume\/)([^/?#]+)/g,
  /(\/v1\/orders\/)([^/?#]+)/g,
  /(\/api\/v1\/drafts\/)([^/?#]+)/g,
  /(\/api\/v1\/resume\/)([^/?#]+)/g,
  /(\/api\/v1\/orders\/)([^/?#]+)/g,
];
const PATH_METADATA_KEYS = new Set([
  "path",
  "pathname",
  "route",
  "url",
  "to",
  "from",
  "next",
]);
const PATH_METADATA_SUFFIXES = [".path", ".pathname", ".route", ".target", ".url"];

export function getFrontendSentryDsn(): string | null {
  return env.NEXT_PUBLIC_SENTRY_DSN ?? null;
}

export function getServerSentryDsn(): string | null {
  return process.env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN ?? null;
}

export function hasFrontendSentryDsn(): boolean {
  return getFrontendSentryDsn() !== null;
}

function redactTokenizedPathSegments(value: string): string {
  let sanitized = value;

  for (const pattern of TOKENIZED_PATH_PATTERNS) {
    sanitized = sanitized.replace(pattern, `$1${TOKEN_PLACEHOLDER}`);
  }

  return sanitized;
}

export function sanitizeObservabilityPath(value: string): string {
  try {
    const url = new URL(value);
    url.pathname = redactTokenizedPathSegments(url.pathname);

    for (const [key, rawValue] of url.searchParams.entries()) {
      url.searchParams.set(key, redactTokenizedPathSegments(rawValue));
    }

    return url.toString();
  } catch {
    return redactTokenizedPathSegments(value);
  }
}

export function sanitizeObservabilityMetadata(
  metadata: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  const sanitizedEntries = Object.entries(metadata).map(([key, value]) => {
    if (typeof value === "string" && shouldSanitizeMetadataKey(key)) {
      return [key, sanitizeObservabilityPath(value)] as const;
    }

    return [key, value] as const;
  });

  return Object.fromEntries(sanitizedEntries);
}

function shouldSanitizeMetadataKey(key: string): boolean {
  return (
    PATH_METADATA_KEYS.has(key) ||
    PATH_METADATA_SUFFIXES.some((suffix) => key.endsWith(suffix))
  );
}

function sanitizeLooseMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const sanitizedEntries = Object.entries(metadata).map(([key, value]) => {
    if (typeof value === "string" && shouldSanitizeMetadataKey(key)) {
      return [key, sanitizeObservabilityPath(value)] as const;
    }

    return [key, value] as const;
  });

  return Object.fromEntries(sanitizedEntries);
}

function sanitizeSpanAttributes(attributes: SpanJSON["data"]): SpanJSON["data"] {
  const sanitizedEntries = Object.entries(attributes).map(([key, value]) => {
    if (typeof value === "string" && shouldSanitizeMetadataKey(key)) {
      return [key, sanitizeObservabilityPath(value)] as const;
    }

    return [key, value] as const;
  });

  return Object.fromEntries(sanitizedEntries);
}

function isMetadataRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeSpan(span: SpanJSON): SpanJSON {
  if (typeof span.description === "string") {
    span.description = sanitizeObservabilityPath(span.description);
  }

  if (span.data) {
    span.data = sanitizeSpanAttributes(span.data);
  }

  return span;
}

function stripSentryPii<T extends ErrorEvent | TransactionEvent>(event: T): T {
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    if (event.request.url) {
      event.request.url = sanitizeObservabilityPath(event.request.url);
    }
  }

  if (typeof event.transaction === "string") {
    event.transaction = sanitizeObservabilityPath(event.transaction);
  }

  if (event.tags?.route) {
    event.tags.route = sanitizeObservabilityPath(String(event.tags.route));
  }

  const contexts = event.contexts as
    | (typeof event.contexts & {
        safe_metadata?: Record<string, unknown>;
      })
    | undefined;
  if (isMetadataRecord(contexts?.safe_metadata)) {
    contexts.safe_metadata = sanitizeLooseMetadata(contexts.safe_metadata);
  }

  if (Array.isArray(event.breadcrumbs)) {
    for (const breadcrumb of event.breadcrumbs) {
      if (isMetadataRecord(breadcrumb.data)) {
        breadcrumb.data = sanitizeLooseMetadata(breadcrumb.data);
      }
    }
  }

  if (Array.isArray(event.spans)) {
    event.spans = event.spans.map((span: SpanJSON) => sanitizeSpan(span));
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
    beforeSendTransaction: stripSentryPii,
  };
}
