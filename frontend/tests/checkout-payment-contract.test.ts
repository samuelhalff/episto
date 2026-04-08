import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const checkoutPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx"),
  "utf8",
);
const stripePaymentFormSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/StripePaymentForm.tsx"),
  "utf8",
);

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

// ---------------------------------------------------------------------------
// i18n key coverage
// ---------------------------------------------------------------------------

const NEW_CHECKOUT_KEYS = [
  "emailHelp",
  "paymentMethodsHelp",
  "calculatingPayment",
  "paymentSessionExpired",
] as const;

describe("checkout-payment-contract i18n", () => {
  for (const locale of locales) {
    describe(locale.name, () => {
      const checkout = (locale.data as Record<string, Record<string, string>>)["checkout"];

      for (const key of NEW_CHECKOUT_KEYS) {
        it(`has key "${key}"`, () => {
          expect(checkout[key]).toBeDefined();
          expect(typeof checkout[key]).toBe("string");
          expect(checkout[key].length).toBeGreaterThan(0);
        });
      }
    });
  }

  it("en-CH emailHelp mentions secure order-status link", () => {
    const checkout = (enCH as Record<string, Record<string, string>>)["checkout"];
    expect(checkout["emailHelp"]).toContain("secure order-status link");
  });

  it("en-CH paymentMethodsHelp mentions TWINT", () => {
    const checkout = (enCH as Record<string, Record<string, string>>)["checkout"];
    expect(checkout["paymentMethodsHelp"]).toContain("TWINT");
  });

  it("en-CH paymentMethodsHelp mentions supported wallets", () => {
    const checkout = (enCH as Record<string, Record<string, string>>)["checkout"];
    expect(checkout["paymentMethodsHelp"]).toContain("supported wallets");
  });

  it('en-CH calculatingPayment is exactly "Calculating\u2026"', () => {
    const checkout = (enCH as Record<string, Record<string, string>>)["checkout"];
    expect(checkout["calculatingPayment"]).toBe("Calculating\u2026");
  });
});

// ---------------------------------------------------------------------------
// Checkout page — layout and pricing-pending CTA
// ---------------------------------------------------------------------------

describe("checkout-payment-contract page layout", () => {
  it("derives isPricingPending from pricingPendingMessage", () => {
    expect(checkoutPageSource).toContain("isPricingPending = Boolean(pricingPendingMessage)");
  });

  it("uses dock-aware bottom padding (11rem) on the main grid", () => {
    expect(checkoutPageSource).toContain("pb-[calc(11rem+env(safe-area-inset-bottom))]");
  });

  it("makes the top content container full-width with no max-width cap", () => {
    expect(checkoutPageSource).toContain("w-full max-w-none");
  });

  it("adds w-full to the email input element", () => {
    // The input className string must contain w-full
    const emailInputMatch = checkoutPageSource.match(/id="email"[\s\S]{0,600}className=\{/);
    expect(emailInputMatch).not.toBeNull();
    // w-full appears in the className array for the email input block
    const emailBlock = checkoutPageSource.slice(
      checkoutPageSource.indexOf('id="email"'),
      checkoutPageSource.indexOf('id="email"') + 800,
    );
    expect(emailBlock).toContain("w-full");
  });

  it("passes loading={isSubmitting || isPricingPending} to the primary CTA", () => {
    expect(checkoutPageSource).toContain("isSubmitting || isPricingPending");
  });

  it("shows calculatingPayment label when pricing is pending", () => {
    expect(checkoutPageSource).toContain('t("calculatingPayment")');
  });

  it("hides the trailing arrow icon when pricing is pending", () => {
    // The arrow should be conditional on pricing NOT pending
    expect(checkoutPageSource).toContain("isPricingPending");
    // trailingIcon must not be unconditionally present — it is conditionally omitted
    const trailingIconMatch = checkoutPageSource.match(
      /trailingIcon=\{[^}]*isPricingPending[^}]*\}/s,
    );
    expect(trailingIconMatch).not.toBeNull();
  });

  it("gives the desktop back action room instead of forcing equal-width compression", () => {
    const backActionBlock = checkoutPageSource.slice(
      checkoutPageSource.indexOf("href={backToReviewHref}"),
      checkoutPageSource.indexOf("primaryAction={"),
    );
    expect(checkoutPageSource).toContain('className="sm:w-auto sm:min-w-[10rem]"');
    expect(backActionBlock).not.toContain('className="sm:flex-1"');
  });
});

// ---------------------------------------------------------------------------
// StripePaymentForm — payment method help text
// ---------------------------------------------------------------------------

describe("checkout-payment-contract StripePaymentForm", () => {
  it("renders a paymentMethodsHelp paragraph", () => {
    expect(stripePaymentFormSource).toContain('t("paymentMethodsHelp")');
  });

  it("styles the paymentMethodsHelp paragraph as a subtle helper inside the secure checkout panel", () => {
    expect(stripePaymentFormSource).toContain("mb-4 mt-2 text-sm leading-6");
  });

  it("paymentMethodOrder contract: first twint, second card, length 2", () => {
    const match = stripePaymentFormSource.match(/paymentMethodOrder:\s*\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const methods = match![1].split(",").map((s: string) => s.trim().replace(/['"]/g, ""));
    expect(methods).toHaveLength(2);
    expect(methods[0]).toBe("twint");
    expect(methods[1]).toBe("card");
  });

  it("does not render a trailing price chip in the final Stripe payment CTA", () => {
    expect(stripePaymentFormSource).not.toContain("trailingMeta={");
    expect(stripePaymentFormSource).not.toContain("formatCentsAsCHF");
    expect(stripePaymentFormSource).toContain(
      '{isSubmitting ? t("paymentConfirming") : buttonLabel}',
    );
  });

  it("passes the checkout billing email to confirmPayment when Stripe does not collect it in the element", () => {
    expect(stripePaymentFormSource).toContain('email: "never"');
    expect(stripePaymentFormSource).toContain("payment_method_data");
    expect(stripePaymentFormSource).toContain("billing_details");
    expect(stripePaymentFormSource).toContain("email: normalizedBillingEmail");
  });

  it("shows Swiss Mail as the business name in the PaymentElement and keeps the accordion expanded", () => {
    expect(stripePaymentFormSource).toContain('business: { name: "Swiss Mail" }');
    expect(stripePaymentFormSource).toContain('type: "accordion"');
    expect(stripePaymentFormSource).toContain("defaultCollapsed: false");
  });

  it("gives the Stripe-stage back action the same desktop minimum width as the first checkout stage", () => {
    const stripeBackActionBlock = checkoutPageSource.slice(
      checkoutPageSource.indexOf('href={`/draft/${draftId}/review`}'),
      checkoutPageSource.indexOf("</ActionLink>", checkoutPageSource.indexOf('href={`/draft/${draftId}/review`}')),
    );
    expect(stripeBackActionBlock).toContain('href={`/draft/${draftId}/review`}');
    expect(stripeBackActionBlock).not.toContain('className="sm:flex-1"');
    expect(stripeBackActionBlock).toContain('className="sm:w-auto sm:min-w-[10rem]"');
  });

  it("hydrates the Stripe payment step with the submitted or session email", () => {
    expect(checkoutPageSource).toContain("useSession");
    expect(checkoutPageSource).toContain('submittedCheckoutEmail ?? session.session?.email ?? ""');
    expect(checkoutPageSource).toContain("billingEmail={billingEmail}");
  });
});
