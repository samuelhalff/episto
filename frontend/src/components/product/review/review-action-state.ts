"use client";

export interface ReviewPrimaryActionStateInput {
  allComplete: boolean;
  alreadyPrepared: boolean;
  hasQuote: boolean;
  hasQuoteError: boolean;
  isQuoteLoading: boolean;
  isSubmitting: boolean;
  isRenderPending: boolean;
}

export interface ReviewPrimaryActionState {
  canProceed: boolean;
  disabled: boolean;
  loading: boolean;
  labelKey: "calculatingPrice" | "proceedToPayment";
  showTrailingMeta: boolean;
}

export function getReviewPrimaryActionState({
  allComplete,
  alreadyPrepared,
  hasQuote,
  hasQuoteError,
  isQuoteLoading,
  isSubmitting,
  isRenderPending,
}: ReviewPrimaryActionStateInput): ReviewPrimaryActionState {
  const quoteIsColdStarting =
    allComplete && !alreadyPrepared && !hasQuote && !hasQuoteError && !isRenderPending;
  const quoteIsPending = isRenderPending || quoteIsColdStarting || isQuoteLoading;
  const canProceed =
    allComplete &&
    !isSubmitting &&
    !isRenderPending &&
    (alreadyPrepared || (hasQuote && !hasQuoteError));

  return {
    canProceed,
    disabled: !canProceed,
    loading: isSubmitting || quoteIsPending,
    labelKey: quoteIsPending ? "calculatingPrice" : "proceedToPayment",
    showTrailingMeta: canProceed && hasQuote && !isSubmitting && !quoteIsPending,
  };
}

export function useReviewPrimaryActionState(
  input: ReviewPrimaryActionStateInput,
): ReviewPrimaryActionState {
  return getReviewPrimaryActionState(input);
}
