import { AppError } from "../../../shared/errors/index.js";
import { extractErrorMessage } from "./epost-response-mappers.js";

export function mapHttpError(
  operation: string,
  status: number,
  payload: unknown,
): AppError {
  const details =
    extractErrorMessage(payload) ?? `ePost ${operation} failed with status ${status}`;

  if (status === 400 || status === 422) {
    return new AppError({
      family: "dispatch_rejection",
      statusCode: 422,
      code: "EPOST_REJECTED_REQUEST",
      message: details,
      userMessage: "The postal provider rejected this letter.",
      userAction: "Check the letter data and try again.",
    });
  }

  if (status === 403) {
    return new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "EPOST_ACCESS_DENIED",
      message: details,
      userMessage: "The postal provider account cannot perform this action right now.",
      userAction: "Verify the provider account setup and retry.",
    });
  }

  return new AppError({
    family: "provider_outage",
    statusCode: 503,
    code: "EPOST_REQUEST_FAILED",
    message: details,
    userMessage: "Postal dispatch is temporarily unavailable.",
    userAction: "Please try again shortly.",
  });
}
