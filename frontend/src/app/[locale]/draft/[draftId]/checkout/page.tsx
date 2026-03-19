"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useDraft, useCheckout } from "../../../../../hooks/use-api.js";
import { usePricing, formatCentsAsCHF } from "../../../../../hooks/use-pricing.js";
import { Link, useRouter } from "../../../../../i18n/navigation.js";
import { Lock, Truck, ShieldCheck, Loader2 } from "lucide-react";
import { DeliveryType } from "@swiss-mail/shared";
import { PriceSummary } from "../../../../../components/product/PriceSummary.js";
import { StripePaymentForm } from "../../../../../components/product/StripePaymentForm.js";

// ---------------------------------------------------------------------------
// Stripe setup — publishable key is a build-time NEXT_PUBLIC_ variable.
// loadStripe is called once at module level; it is safe to call with
// undefined/empty (returns null) — the Elements provider handles this case.
// ---------------------------------------------------------------------------

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

// ---------------------------------------------------------------------------
// Checkout Page
// ---------------------------------------------------------------------------

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ draftId: string; locale: string }>;
}) {
  const { draftId, locale } = use(params);
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const router = useRouter();

  const draft = useDraft(draftId);
  const checkout = useCheckout(draftId);
  const pricing = usePricing();

  const [email, setEmail] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);

  // Once the backend creates a PaymentIntent we receive the clientSecret.
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [priceCents, setPriceCents] = useState<number>(0);

  const isEmailValid = email.includes("@") && email.includes(".");
  const isFormValid = isEmailValid && legalConsent;
  const isSubmitting = checkout.isPending;

  if (draft.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">{tc("error")}</p>
      </div>
    );
  }

  const d = draft.data;
  const isRegistered = d.deliveryType === DeliveryType.registered;

  // Fallback display price for the CTA before pricing data loads.
  const displayPrice = pricing.data
    ? isRegistered
      ? pricing.data.registered.displayPrice
      : pricing.data.standard.displayPrice
    : formatCentsAsCHF(isRegistered ? 890 : 490);

  // Absolute return URL for Stripe to redirect to after payment.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const returnUrl = `${origin}/${locale}/draft/${draftId}/confirmation`;

  function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    checkout.mutate(
      { email },
      {
        onSuccess: (data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            setPriceCents(data.priceCents);
          } else {
            // PaymentIntent already captured (idempotent retry) — go to confirmation.
            router.push(`/draft/${draftId}/confirmation`);
          }
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="font-bold text-navy">
            {tc("appName")}
          </Link>
          <span className="text-sm font-medium text-navy">{t("title")}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

        {/* Order summary */}
        <PriceSummary
          deliveryType={d.deliveryType}
          subject={d.subject}
        />

        {/* ── Step 1: Email + consent ── */}
        {!clientSecret && (
          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            {/* Email */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-900"
              >
                {t("email")}
              </label>
              <p className="mt-1 text-xs text-gray-500">{t("emailHelp")}</p>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                placeholder="name@example.com"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            {/* Legal consent */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
              <input
                type="checkbox"
                checked={legalConsent}
                onChange={(e) => setLegalConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-navy focus:ring-navy"
              />
              <span className="text-gray-600">{t("legalConsent")}</span>
            </label>

            {/* Error message */}
            {checkout.error && (
              <p role="alert" className="text-sm text-red-600">
                {tc("error")}
              </p>
            )}

            {/* Continue to payment */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full rounded-lg bg-navy py-3.5 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-40"
            >
              {isSubmitting ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                `${t("continueToPayment")} — ${displayPrice}`
              )}
            </button>
          </form>
        )}

        {/* ── Step 2: Stripe PaymentElement ── */}
        {clientSecret && stripePromise && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              {t("enterPaymentDetails")}
            </h2>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                locale: locale as Parameters<typeof Elements>[0]["options"] extends { locale?: infer L } ? L : "de",
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#1a2e4a", // --color-navy
                    borderRadius: "8px",
                    fontFamily: "inherit",
                  },
                },
              }}
            >
              <StripePaymentForm
                priceCents={priceCents}
                returnUrl={returnUrl}
                buttonLabel={t("sendMyLetter")}
              />
            </Elements>
          </div>
        )}

        {/* ── Stripe key missing (dev notice only) ── */}
        {clientSecret && !stripePromise && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">
              {t("paymentPending")}
            </p>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            {t("securedByStripe")}
          </span>
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            {t("swissDelivery")}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("dataProtection")}
          </span>
        </div>
      </main>
    </div>
  );
}
