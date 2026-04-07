"use client";

import { useMemo } from "react";

export interface ReviewPrimaryActionStateInput {
  allComplete: boolean;
  alreadyPrepared: boolean;
  hasQuote: boolean;
  hasQuoteError: boolean;
  isQuoteLoading: boolean;
  isSubmitting: boolean;
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
}: ReviewPrimaryActionStateInput): ReviewPrimaryActionState {
  const quoteIsColdStarting =
    allComplete && !alreadyPrepared && !hasQuote && !hasQuoteError;
  const quoteIsPending = quoteIsColdStarting || isQuoteLoading;
  const canProceed =
    allComplete && !isSubmitting && (alreadyPrepared || (hasQuote && !hasQuoteError));

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
  return useMemo(
    () => getReviewPrimaryActionState(input),
    [
      input.allComplete,
      input.alreadyPrepared,
      input.hasQuote,
      input.hasQuoteError,
      input.isQuoteLoading,
      input.isSubmitting,
    ],
  );
}
