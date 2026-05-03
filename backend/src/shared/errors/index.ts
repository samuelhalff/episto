import type { ErrorFamily, ApiErrorResponse } from "@episto/shared";

/**
 * Application error base class.
 * All domain errors extend this so the error handler can map them uniformly.
 */
export class AppError extends Error {
  readonly family: ErrorFamily;
  readonly statusCode: number;
  readonly code: string;
  readonly userMessage: string;
  readonly userAction: string | null;
  readonly fields: Array<{ field: string; message: string }> | undefined;

  constructor(opts: {
    family: ErrorFamily;
    statusCode: number;
    code: string;
    message: string;
    userMessage: string;
    userAction?: string | null | undefined;
    fields?: Array<{ field: string; message: string }> | undefined;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = "AppError";
    this.family = opts.family;
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.userMessage = opts.userMessage;
    this.userAction = opts.userAction ?? null;
    this.fields = opts.fields;
  }

  toResponse(requestId?: string): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        family: this.family,
        message: this.message,
        userMessage: this.userMessage,
        userAction: this.userAction,
        ...(this.fields?.length ? { fields: this.fields } : {}),
        ...(requestId ? { requestId } : {}),
      },
    };
  }
}

// ---- HTTP status code mapping per error family ----

const FAMILY_STATUS = new Map<ErrorFamily, number>([
  ["validation_error", 400],
  ["policy_refusal", 403],
  ["payment_failure", 402],
  ["dispatch_rejection", 422],
  ["dispatch_ambiguity", 502],
  ["provider_outage", 503],
  ["tracking_unavailable", 503],
  ["file_upload_failure", 422],
  ["rendering_failure", 500],
  ["retention_cleanup_failure", 500],
]);

export function statusForFamily(family: ErrorFamily): number {
  return FAMILY_STATUS.get(family) ?? 500;
}

// ---- Convenience factories ----

export function validationError(
  message: string,
  fields?: Array<{ field: string; message: string }>,
): AppError {
  return new AppError({
    family: "validation_error",
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message,
    userMessage: message,
    userAction: "Please correct the highlighted fields and try again.",
    ...(fields ? { fields } : {}),
  });
}

export function notFoundError(resource: string): AppError {
  return new AppError({
    family: "validation_error",
    statusCode: 404,
    code: "NOT_FOUND",
    message: `${resource} not found`,
    userMessage: `The requested ${resource} could not be found.`,
    userAction: null,
  });
}

export function providerOutageError(provider: string, cause?: unknown): AppError {
  return new AppError({
    family: "provider_outage",
    statusCode: 503,
    code: "PROVIDER_OUTAGE",
    message: `${provider} is unavailable`,
    userMessage: `An external service is temporarily unavailable. Please try again shortly.`,
    userAction: "Wait a moment and retry.",
    cause,
  });
}
