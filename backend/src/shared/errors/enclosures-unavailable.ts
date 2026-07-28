import { AppError } from "./index.js";

export const ENCLOSURES_UNAVAILABLE_CODE = "DISPATCH_ENCLOSURES_UNAVAILABLE";

export function isEnclosuresUnavailableError(error: unknown): boolean {
  return error instanceof AppError && error.code === ENCLOSURES_UNAVAILABLE_CODE;
}

/**
 * The user's enclosure is no longer available to send.
 *
 * Retention retires `file_assets` rows to `pending_deletion`, and dispatch only
 * ever loads `active` ones. If those two race, the letter would otherwise go to
 * Swiss Post without the document the user paid to enclose. This is the failure
 * that stops that — so it must be loud and terminal, not a 404 that reads like
 * a lookup bug and invites a retry that can never succeed.
 *
 * `retention_cleanup_failure` rather than a dispatch family because that is
 * what actually went wrong: nothing is wrong with the dispatch.
 */
export function enclosuresUnavailableError(assetIds: string[]): AppError {
  return new AppError({
    family: "retention_cleanup_failure",
    statusCode: 409,
    code: ENCLOSURES_UNAVAILABLE_CODE,
    message: `Enclosures are no longer available for dispatch: ${assetIds.join(", ")}`,
    userMessage:
      "The documents attached to this letter are no longer available, so it was not sent.",
    userAction: "Contact support — your payment will be refunded.",
  });
}
