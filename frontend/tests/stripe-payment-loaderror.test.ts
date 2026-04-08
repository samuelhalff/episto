import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const stripePaymentFormSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/StripePaymentForm.tsx"),
  "utf8",
);
const checkoutPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx"),
  "utf8",
);
const checkoutHookSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-checkout.ts"),
  "utf8",
);

describe("stripe payment loaderror handling", () => {
  it("handles PaymentElement loaderror events instead of leaving Stripe to log them as unhandled", () => {
    expect(stripePaymentFormSource).toContain("onLoadError=");
  });

  it("captures the Stripe loaderror details and surfaces a user-visible error state", () => {
    expect(stripePaymentFormSource).toContain("captureError(");
    expect(stripePaymentFormSource).toContain("loadErrorEvent.error.message");
    expect(stripePaymentFormSource).toContain("setPaymentElementLoadFailed(true)");
  });

  it("records a warning when Stripe load errors do not match the terminal-intent recovery path", () => {
    expect(stripePaymentFormSource).toContain("captureMessage(");
    expect(stripePaymentFormSource).toContain('"warning"');
  });

  it("routes Stripe load errors back into a retryable checkout state", () => {
    expect(stripePaymentFormSource).toContain("onLoadErrorRecovery");
    expect(stripePaymentFormSource).toContain("terminal state");
    expect(stripePaymentFormSource).toContain("cannot be used to initialize elements");
    expect(checkoutPageSource).toContain("onLoadErrorRecovery={");
    expect(checkoutPageSource).toContain('t("paymentSessionExpired")');
    expect(checkoutPageSource).toContain('t("paymentFormUnavailable")');
    expect(checkoutHookSource).toContain("resetClientSecret");
  });
});
