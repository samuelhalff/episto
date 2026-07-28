import { AppError } from "./index.js";

/**
 * SQLSTATE raised by the erasure-guard triggers (migration
 * `0024_draft_erasure_tombstone`). User-defined class `Z`, so it can never
 * collide with a standard Postgres condition.
 */
export const ERASED_DRAFT_SQLSTATE = "ZE001";

export function isErasedDraftViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === ERASED_DRAFT_SQLSTATE
  );
}

/**
 * The erasure guard lives in the database precisely so that no write path can
 * forget it — which means the translation to an HTTP answer belongs in one
 * place too, rather than in each of the ~15 services that can trip it.
 *
 * 410 rather than 404: the draft existed, and saying so is the honest answer
 * to someone whose tab was open when support erased their data.
 */
export function erasedDraftError(cause?: unknown): AppError {
  return new AppError({
    family: "validation_error",
    statusCode: 410,
    code: "DRAFT_ERASED",
    message: "The draft was erased and no longer accepts writes",
    userMessage: "This letter has been deleted and can no longer be changed.",
    userAction: "Start a new letter.",
    cause,
  });
}
