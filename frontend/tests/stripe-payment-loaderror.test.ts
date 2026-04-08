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

  it("treats terminal PaymentIntent load errors as recoverable and clears the stale checkout client secret", () => {
    expect(stripePaymentFormSource).toContain("onTerminalPaymentIntent");
    expect(stripePaymentFormSource).toContain("terminal state");
    expect(checkoutPageSource).toContain("onTerminalPaymentIntent={");
    expect(checkoutPageSource).toContain('t("paymentSessionExpired")');
    expect(checkoutHookSource).toContain("resetClientSecret");
  });
});
