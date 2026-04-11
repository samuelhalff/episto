import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { assertDefined } from "./assert-defined";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const stripePaymentFormSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/StripePaymentForm.tsx"),
  "utf8",
);
const checkoutPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx"),
  "utf8",
);
const useCheckoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-checkout.ts"),
  "utf8",
);
const globalsCssSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);
const priceSummarySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/PriceSummary.tsx"),
  "utf8",
);

const REQUIRED_CHECKOUT_KEYS = [
  "title",
  "orderSummary",
  "checkoutIntro",
  "email",
  "emailHelp",
  "consentRequired",
  "legalConsent",
  "sendMyLetter",
  "securedByStripe",
  "swissDelivery",
  "dataProtection",
  "defaultLetterTitle",
  "draftingIncluded",
  "delivery",
  "deliveryStandardLabel",
  "deliveryRegisteredLabel",
  "providerQuoteLabel",
  "swissMailServiceLabel",
  "secureCheckout",
  "paymentHelp",
  "total",
  "livePricingTitle",
  "priceUnavailable",
  "pricingPending",
  "pricingLoading",
  "pricingBlockedBody",
  "pricingBlockedEnvironmentBody",
  "paymentBlockedEnvironmentBody",
  "paymentConfirming",
  "paymentError",
  "enterPaymentDetails",
  "continueToPayment",
  "backToReview",
] as const;

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

describe("checkout i18n keys", () => {
  for (const locale of locales) {
    describe(locale.name, () => {
      const checkout = (locale.data as Record<string, Record<string, string>>)[
        "checkout"
      ];

      it("has a checkout section", () => {
        expect(checkout).toBeDefined();
      });

      for (const key of REQUIRED_CHECKOUT_KEYS) {
        it(`has key "${key}"`, () => {
          expect(checkout[key]).toBeDefined();
          expect(typeof checkout[key]).toBe("string");
          expect(checkout[key].length).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe("checkout footer actions", () => {
  it("keeps checkout blocked on payment creation failures even when pricing is already present", () => {
    expect(checkoutPageSource).toContain("showCheckoutBlockedState");
    expect(checkoutPageSource).toContain('t("pricingBlockedEnvironmentBody")');
  });

  it("keeps checkout focused on payment instead of exposing draft step navigation", () => {
    expect(checkoutPageSource).not.toContain("<DraftStepMenu");
  });

  it("uses the shared action button in the checkout form", () => {
    expect(checkoutPageSource).toContain("<ActionButton");
  });

  it("provides a route back to review in the checkout page bottom bar", () => {
    expect(checkoutPageSource).toContain('t("backToReview")');
  });

  it("uses the shared action button in the Stripe payment footer", () => {
    expect(stripePaymentFormSource).toContain("<ActionButton");
  });

  it("opts checkout and payment dock actions into the shared desktop minimum width treatment", () => {
    expect(checkoutPageSource).toContain("desktopMinWidth");
    expect(stripePaymentFormSource).toContain("desktopMinWidth");
    expect(checkoutPageSource).not.toContain("sm:min-w-[10rem]");
  });

  it("uses the shared form-control utility and Stripe 16px base sizing", () => {
    expect(globalsCssSource).toContain(".app-form-control");
    expect(checkoutPageSource).toContain("app-form-control");
    expect(checkoutPageSource).toContain('fontSizeBase: "16px"');
  });

  it("does not treat the missing pre-checkout payment lookup as a blocking error", () => {
    expect(useCheckoutSource).toContain("isApiErrorWithStatus(error, 404)");
  });

  it("surfaces backend user messages instead of a generic pay-page failure label", () => {
    expect(checkoutPageSource).toContain("getApiErrorUserMessage(checkout.error)");
  });

  it("renders a blocked checkout state when live postal pricing is unavailable", () => {
    expect(checkoutPageSource).toContain("showCheckoutBlockedState");
    expect(checkoutPageSource).toContain('t("pricingBlockedEnvironmentBody")');
    expect(checkoutPageSource).toContain("router.push(`/draft/${draftId}/review`)");
  });

  it("renders a blocked checkout state when Stripe is not configured with real keys", () => {
    expect(checkoutPageSource).toContain("loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)");
    expect(checkoutPageSource).toContain('checkoutErrorCode === "STRIPE_NOT_CONFIGURED"');
    expect(checkoutPageSource).toContain('t("paymentBlockedEnvironmentBody")');
  });

  it("orders payment methods as Twint, card, Apple Pay, then Google Pay", () => {
    const match = stripePaymentFormSource.match(/paymentMethodOrder:\s*\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const methods = assertDefined(match)[1]
      .split(",")
      .map((s: string) => s.trim().replace(/['"]/g, ""));
    expect(methods).toEqual(["twint", "card", "apple_pay", "google_pay"]);
  });

  it("waits for rendering to finish before requesting a live quote", () => {
    expect(checkoutPageSource).toContain('!["reviewed", "rendering"].includes');
    expect(checkoutPageSource).toContain("quoteEnabled={canRequestQuote}");
    expect(checkoutPageSource).toContain('t("pricingPending")');
  });

  it("keeps Stripe appearance aligned with the yellow primary action color", () => {
    expect(checkoutPageSource).toContain('colorPrimary: "#f6c54a"');
    expect(checkoutPageSource).toContain("Must match --action-primary-bg in globals.css");
    expect(checkoutPageSource).not.toContain('colorPrimary: "#18181b"');
  });

  it("uses the flat Stripe theme in light mode and night in dark mode", () => {
    expect(checkoutPageSource).toContain("useTheme");
    expect(checkoutPageSource).toContain('theme === "dark" ? "night" : "flat"');
    expect(checkoutPageSource).toContain("colorBackground");
    expect(checkoutPageSource).toContain("colorText");
  });

  it("gives Stripe a deliberate Stripe-style sans stack and floating labels instead of inheriting a serif fallback", () => {
    expect(checkoutPageSource).toContain("fontFamily:");
    expect(checkoutPageSource).toContain('\\"Ideal Sans\\", \\"Inter\\", system-ui');
    expect(checkoutPageSource).toContain('labels: "floating"');
    expect(checkoutPageSource).not.toContain('fontFamily: "inherit"');
  });

  it("prefills the billing email into the PaymentElement when email collection is hidden inside Stripe", () => {
    expect(stripePaymentFormSource).toContain("defaultValues:");
    expect(stripePaymentFormSource).toContain("billingDetails: {");
    expect(stripePaymentFormSource).toContain("email: normalizedBillingEmail");
    expect(stripePaymentFormSource).toContain("payment_method_data");
    expect(stripePaymentFormSource).toContain("email: normalizedBillingEmail");
    expect(stripePaymentFormSource).toContain('email: "never"');
  });

  it("uses a compact accordion PaymentElement layout for cleaner multi-method checkout", () => {
    expect(stripePaymentFormSource).toContain("layout: {");
    expect(stripePaymentFormSource).toContain('type: "accordion"');
    expect(stripePaymentFormSource).toContain("spacedAccordionItems: false");
    expect(stripePaymentFormSource).not.toContain('layout: { type: "tabs"');
  });

  it("tightens Stripe spacing so wallet rows stay readable on smaller screens", () => {
    expect(checkoutPageSource).toContain('spacingUnit: "4px"');
    expect(checkoutPageSource).toContain('gridRowSpacing: "14px"');
  });

  it("reuses the shared section label and muted surfaces on the payment step", () => {
    expect(checkoutPageSource).toContain("section-label");
    expect(stripePaymentFormSource).toContain("app-panel-muted");
    expect(stripePaymentFormSource).toContain("app-list-item-muted");
  });

  it("surfaces secure checkout context and the confirmed billing email inside the Stripe payment stage", () => {
    expect(stripePaymentFormSource).toContain('t("secureCheckout")');
    expect(stripePaymentFormSource).toContain('t("email")');
    expect(stripePaymentFormSource).toContain("{normalizedBillingEmail}");
    expect(stripePaymentFormSource).toContain("lg:grid-cols-[minmax(0,1fr)_18rem]");
  });

  it("uses shared status and delivery badges in the order summary", () => {
    expect(priceSummarySource).toContain("StatusBadge");
    expect(priceSummarySource).toContain("DeliveryTypeBadge");
    expect(priceSummarySource).not.toContain("text-amber-950");
  });

  it("uses semantic destructive text without the old price-pill footer meta", () => {
    expect(stripePaymentFormSource).toContain("text-destructive");
    expect(stripePaymentFormSource).not.toContain("text-red-600 dark:text-red-400");
    expect(stripePaymentFormSource).not.toContain("text-[var(--action-primary-fg)]/90");
  });
});
