import { describe, expect, it } from "vitest";

import { getReviewPrimaryActionState } from "../src/components/product/review/review-action-state";

describe("review primary action state", () => {
  it("keeps the action disabled while the final preview is still rendering", () => {
    expect(
      getReviewPrimaryActionState({
        allComplete: true,
        alreadyPrepared: true,
        hasQuote: false,
        hasQuoteError: false,
        isQuoteLoading: false,
        isSubmitting: false,
        isRenderPending: true,
      }),
    ).toMatchObject({
      canProceed: false,
      disabled: true,
      loading: true,
      labelKey: "calculatingPrice",
    });
  });

  it("allows checkout once the draft is ready and pricing has loaded", () => {
    expect(
      getReviewPrimaryActionState({
        allComplete: true,
        alreadyPrepared: true,
        hasQuote: true,
        hasQuoteError: false,
        isQuoteLoading: false,
        isSubmitting: false,
        isRenderPending: false,
      }),
    ).toMatchObject({
      canProceed: true,
      disabled: false,
      loading: false,
      labelKey: "proceedToPayment",
    });
  });
});
