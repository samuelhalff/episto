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

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const STRIPE_LOCALE_MAP: Record<string, "de" | "fr" | "it" | "en"> = {
  "de-CH": "de",
  "fr-CH": "fr",
  "it-CH": "it",
  "en-CH": "en",
};

function toStripeLocale(locale: string): "de" | "fr" | "it" | "en" {
  return STRIPE_LOCALE_MAP[locale] ?? "de";
}

function createCheckoutSchema(consentMessage: string) {
  return z.object({
    email: z.string().email(),
    legalConsent: z.literal(true, {
      errorMap: () => ({ message: consentMessage }),
    }),
  });
}

type CheckoutFormValues = z.infer<ReturnType<typeof createCheckoutSchema>>;

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_28%)]">
      <FlowHeader currentStep={2} draftId={draftId} title={t("title")} />

      <main
        id="main-content"
        className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)]"
      >
        <aside className="space-y-4 lg:sticky lg:top-28">
          <PriceSummary deliveryType={d.deliveryType} subject={d.subject} showTrustNote />
        </aside>

        <div className="space-y-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
              {t("orderSummary")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-stone-950 md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-500 md:text-base">
              {t("checkoutIntro")}
            </p>
          </div>

          {!checkout.clientSecret && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-stone-900"
                >
                  {t("email")}
                </label>
                <p className="mt-1 text-xs text-stone-500">{t("emailHelp")}</p>
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
                    "mt-3 w-full rounded-[1rem] border px-4 py-3 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-1",
                    errors.email
                      ? "border-destructive focus:border-destructive focus:ring-destructive"
                      : "border-stone-200 focus:border-primary focus:ring-primary",
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
                  "rounded-[2rem] border bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]",
                  errors.legalConsent ? "border-destructive" : "border-stone-200/80",
                ].join(" ")}
              >
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    {...register("legalConsent")}
                    aria-describedby={errors.legalConsent ? "consent-error" : undefined}
                    aria-invalid={errors.legalConsent ? "true" : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-primary focus:ring-primary"
                  />
                  <span className="text-stone-600">
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

              <div className="sticky bottom-4 z-10 rounded-[1.5rem] border border-stone-200/80 bg-white/95 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
                <button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="w-full rounded-full bg-stone-950 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-40"
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
            <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                {t("enterPaymentDetails")}
              </h2>
              <p className="mb-5 text-sm text-stone-500">{t("paymentHelp")}</p>
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
            <div className="rounded-[2rem] border border-destructive/20 bg-destructive/5 p-6">
              <p className="text-sm text-destructive">{t("paymentConfigError")}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-stone-500">
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
