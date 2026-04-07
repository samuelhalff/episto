import { describe, expect, it } from "vitest";

import { getReviewPrimaryActionState } from "../src/components/product/review/review-action-state";

describe("review primary action state", () => {
  it("shows the calculating label immediately while a fresh quote is still cold-starting", () => {
    expect(
      getReviewPrimaryActionState({
        allComplete: true,
        alreadyPrepared: false,
        hasQuote: false,
        hasQuoteError: false,
        isQuoteLoading: false,
        isSubmitting: false,
      }),
    ).toEqual(
      expect.objectContaining({
        disabled: true,
        loading: true,
        labelKey: "calculatingPrice",
        showTrailingMeta: false,
      }),
    );
  });

  it("keeps the CTA disabled without a loading label when required review fields are still missing", () => {
    expect(
      getReviewPrimaryActionState({
        allComplete: false,
        alreadyPrepared: false,
        hasQuote: false,
        hasQuoteError: false,
        isQuoteLoading: false,
        isSubmitting: false,
      }),
    ).toEqual(
      expect.objectContaining({
        disabled: true,
        loading: false,
        labelKey: "proceedToPayment",
      }),
    );
  });

  it("enables the CTA and exposes trailing price metadata once the quote is ready", () => {
    expect(
      getReviewPrimaryActionState({
        allComplete: true,
        alreadyPrepared: false,
        hasQuote: true,
        hasQuoteError: false,
        isQuoteLoading: false,
        isSubmitting: false,
      }),
    ).toEqual(
      expect.objectContaining({
        disabled: false,
        loading: false,
        labelKey: "proceedToPayment",
        showTrailingMeta: true,
      }),
    );
  });

  it("lets already prepared drafts continue without waiting for another quote", () => {
    expect(
      getReviewPrimaryActionState({
        allComplete: true,
        alreadyPrepared: true,
        hasQuote: false,
        hasQuoteError: false,
        isQuoteLoading: false,
        isSubmitting: false,
      }),
    ).toEqual(
      expect.objectContaining({
        disabled: false,
        loading: false,
        labelKey: "proceedToPayment",
      }),
    );
  });
});
