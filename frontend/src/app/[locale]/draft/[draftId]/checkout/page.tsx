"use client";

import { use, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useDraft, useCheckout } from "../../../../../hooks/use-api.js";
import { Link, useRouter } from "../../../../../i18n/navigation.js";
import { Lock, Truck, ShieldCheck, Loader2 } from "lucide-react";
import { FlowHeader } from "../../../../../components/product/FlowHeader.js";
import { PriceSummary } from "../../../../../components/product/PriceSummary.js";
import { StripePaymentForm } from "../../../../../components/product/StripePaymentForm.js";
import { captureError } from "../../../../../lib/error-tracking.js";

// ---------------------------------------------------------------------------
// Stripe setup
// ---------------------------------------------------------------------------

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

/** Map Swiss locale codes to Stripe-supported locale strings */
const STRIPE_LOCALE_MAP: Record<string, "de" | "fr" | "it" | "en"> = {
  "de-CH": "de",
  "fr-CH": "fr",
  "it-CH": "it",
  "en-CH": "en",
};

function toStripeLocale(locale: string): "de" | "fr" | "it" | "en" {
  return STRIPE_LOCALE_MAP[locale] ?? "de";
}

// ---------------------------------------------------------------------------
// Form schema — email + legal consent
// ---------------------------------------------------------------------------

function createCheckoutSchema(consentMessage: string) {
  return z.object({
    email: z.string().email(),
    legalConsent: z.literal(true, {
      errorMap: () => ({ message: consentMessage }),
    }),
  });
}

type CheckoutFormValues = z.infer<ReturnType<typeof createCheckoutSchema>>;

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

  const checkoutSchema = createCheckoutSchema(t("consentRequired"));
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
  });

  if (draft.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const returnUrl = `${origin}/${locale}/draft/${draftId}/confirmation`;

  const isSubmitting = checkout.isProcessing;

  useEffect(() => {
    if (["authorized", "captured"].includes(checkout.paymentState?.state ?? "")) {
      router.replace(`/draft/${draftId}/confirmation`);
    }
  }, [checkout.paymentState?.state, draftId, router]);

  function onSubmit(values: CheckoutFormValues) {
    if (isSubmitting) return;
    void checkout
      .createPaymentIntent(values.email)
      .then((result) => {
        if (!result.clientSecret) {
          router.push(`/draft/${draftId}/confirmation`);
        }
      })
      .catch((err: unknown) => {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          component: "CheckoutPage",
          route: `/draft/${draftId}/checkout`,
        });
      });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FlowHeader currentStep={2} draftId={draftId} title={t("title")} />

      <main
        id="main-content"
        className="mx-auto grid max-w-5xl gap-6 px-4 pb-12 pt-8 lg:grid-cols-[320px_minmax(0,1fr)]"
      >
        <aside className="space-y-4 lg:sticky lg:top-6">
          <PriceSummary deliveryType={d.deliveryType} subject={d.subject} showTrustNote />
        </aside>

        <div className="space-y-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
            <p className="mt-2 text-sm text-gray-500">{t("checkoutIntro")}</p>
          </div>

          {!checkout.clientSecret && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={errors.email ? "true" : undefined}
                  className={[
                    "mt-3 w-full rounded-lg border px-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1",
                    errors.email
                      ? "border-destructive focus:border-destructive focus:ring-destructive"
                      : "border-gray-200 focus:border-primary focus:ring-primary",
                  ].join(" ")}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    role="alert"
                    className="mt-1 text-xs text-destructive"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div
                className={[
                  "rounded-2xl border bg-white p-5 shadow-sm",
                  errors.legalConsent ? "border-destructive" : "border-gray-200",
                ].join(" ")}
              >
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    {...register("legalConsent")}
                    aria-describedby={errors.legalConsent ? "consent-error" : undefined}
                    aria-invalid={errors.legalConsent ? "true" : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-gray-600">
                    {t.rich("legalConsent", {
                      terms: (chunks) => (
                        <Link
                          href="/terms"
                          target="_blank"
                          className="font-medium text-primary underline underline-offset-4"
                        >
                          {chunks}
                        </Link>
                      ),
                    })}
                  </span>
                </label>
                {errors.legalConsent && (
                  <p
                    id="consent-error"
                    role="alert"
                    className="mt-1 text-xs text-destructive"
                  >
                    {errors.legalConsent.message}
                  </p>
                )}
              </div>

              {checkout.error && (
                <p role="alert" className="text-sm text-destructive">
                  {t("paymentError")}
                </p>
              )}

              <div className="sticky bottom-4 z-10 rounded-2xl bg-white/95 p-2 backdrop-blur lg:static lg:bg-transparent lg:p-0">
                <button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : (
                    t("continueToPayment")
                  )}
                </button>
              </div>
            </form>
          )}

          {checkout.clientSecret && stripePromise && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                {t("enterPaymentDetails")}
              </h2>
              <p className="mb-5 text-sm text-gray-500">{t("paymentHelp")}</p>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: checkout.clientSecret,
                  locale: toStripeLocale(locale),
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#F59E0B",
                      borderRadius: "8px",
                      fontFamily: "inherit",
                    },
                  },
                }}
              >
                <StripePaymentForm
                  priceCents={checkout.pricing?.priceCents ?? 0}
                  returnUrl={returnUrl}
                  buttonLabel={t("sendMyLetter")}
                />
              </Elements>
            </div>
          )}

          {checkout.clientSecret && !stripePromise && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
              <p className="text-sm text-destructive">{t("paymentConfigError")}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-gray-500">
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
        </div>
      </main>
    </div>
  );
}
