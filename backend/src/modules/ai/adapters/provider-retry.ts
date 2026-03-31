import type { Logger } from "pino";

const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);
const RETRYABLE_MESSAGE_PATTERNS = [
  "429",
  "rate limit",
  "too many requests",
  "temporarily unavailable",
  "temporarily busy",
  "overloaded",
  "timeout",
  "timed out",
  "etimedout",
  "econnreset",
  "socket hang up",
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown provider error";
}

function readNumericProperty(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record[key] === "number" ? record[key] : null;
}

function readStringHeader(headers: unknown, key: string): string | null {
  if (!headers) {
    return null;
  }

  if (
    typeof headers === "object" &&
    headers !== null &&
    "get" in headers &&
    typeof (headers as { get?: unknown }).get === "function"
  ) {
    const value = (headers as { get: (name: string) => unknown }).get(key);
    return typeof value === "string" ? value : null;
  }

  if (typeof headers === "object" && !Array.isArray(headers)) {
    const value = (headers as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  }

  return null;
}

function getErrorStatusCode(error: unknown): number | null {
  return (
    readNumericProperty(error, "status") ??
    readNumericProperty(error, "statusCode") ??
    readNumericProperty(readObjectProperty(error, "response"), "status") ??
    null
  );
}

function readObjectProperty(value: unknown, key: string): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidate = record[key];
  return candidate && typeof candidate === "object" && !Array.isArray(candidate)
    ? (candidate as Record<string, unknown>)
    : null;
}

function getRetryAfterMs(error: unknown): number | null {
  const headers =
    readObjectProperty(error, "headers") ?? readObjectProperty(readObjectProperty(error, "response"), "headers");
  const retryAfter = readStringHeader(headers, "retry-after");

  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }

  const rateLimitReset = readStringHeader(headers, "x-ratelimit-reset");
  if (rateLimitReset) {
    const seconds = Number(rateLimitReset);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }

  return null;
}

export function isRetryableProviderError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  if (statusCode !== null && RETRYABLE_STATUS_CODES.has(statusCode)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return RETRYABLE_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern));
}

export function getRetryDelayMs(error: unknown, attempt: number): number {
  const providerHintMs = getRetryAfterMs(error);
  if (providerHintMs !== null) {
    return Math.max(250, Math.min(providerHintMs, 5000));
  }

  return Math.min(500 * 2 ** Math.max(attempt - 1, 0), 3000);
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function withProviderRetries<T>(input: {
  provider: string;
  operation: string;
  logger: Pick<Logger, "warn">;
  run: () => Promise<T>;
  mapError: (error: unknown) => Error;
  maxAttempts?: number;
}): Promise<T> {
  const maxAttempts = input.maxAttempts ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await input.run();
    } catch (error) {
      lastError = input.mapError(error);

      if (attempt >= maxAttempts || !isRetryableProviderError(error)) {
        throw lastError;
      }

      const delayMs = getRetryDelayMs(error, attempt);
      input.logger.warn(
        {
          provider: input.provider,
          operation: input.operation,
          attempt,
          maxAttempts,
          delayMs,
          statusCode: getErrorStatusCode(error),
          errorMessage: getErrorMessage(error),
        },
        "Transient AI provider failure, retrying",
      );
      await sleep(delayMs);
    }
  }

  throw lastError ?? input.mapError(new Error("Provider retry exhausted without a recorded error"));
}
