"use client";

import { use, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useDraft, useCheckout } from "../../../../../hooks/use-api";
import { Link, useRouter } from "../../../../../i18n/navigation";
import { Lock, Truck, ShieldCheck, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { FlowHeader } from "../../../../../components/product/FlowHeader";
import { FlowActionDock } from "../../../../../components/product/FlowActionDock";
import { PriceSummary } from "../../../../../components/product/PriceSummary";
import { StripePaymentForm } from "../../../../../components/product/StripePaymentForm";
import { ActionButton, ActionLink } from "../../../../../components/product/ActionButton";
import { captureError } from "../../../../../lib/error-tracking";
import { normalizeLetterSubject } from "../../../../../lib/letter-content";
import { getApiErrorCode, getApiErrorUserMessage } from "../../../../../lib/api";
import { getCustomerFlowBackPath } from "../../../../../lib/customer-flow";

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

function hasConfiguredStripePublishableKey(value: string): boolean {
  return /^pk_(test|live)_/.test(value) && !/replace_me|placeholder/i.test(value);
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
  const hasConfiguredStripeFrontend =
    hasConfiguredStripePublishableKey(stripePublishableKey);

  const draft = useDraft(draftId);
  const canRequestQuote = !["reviewed", "rendering"].includes(draft.data?.status ?? "");
  const checkout = useCheckout(draftId, { quoteEnabled: canRequestQuote });

  const checkoutSchema = createCheckoutSchema(t("consentRequired"));
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const returnUrl = `${origin}/${locale}/draft/${draftId}/confirmation`;
  const backToReviewHref = getCustomerFlowBackPath(draftId, "checkout") ?? `/draft/${draftId}/review`;

  const isSubmitting = checkout.isProcessing;

  const stripeOptions = useMemo(
    () =>
      checkout.clientSecret
        ? {
            clientSecret: checkout.clientSecret,
            locale: toStripeLocale(locale),
            appearance: {
              theme: "stripe" as const,
              variables: {
                // Must match --action-primary-bg in globals.css. Stripe requires a literal hex.
                colorPrimary: "#f6c54a",
                borderRadius: "12px",
                fontSizeBase: "16px",
                fontFamily: "inherit",
              },
            },
          }
        : null,
    [checkout.clientSecret, locale],
  );

  useEffect(() => {
    if (!draft.data) {
      return;
    }

    if (["authorized", "captured"].includes(checkout.paymentState?.state ?? "")) {
      router.replace(`/draft/${draftId}/confirmation`);
    }
  }, [checkout.paymentState?.state, draft.data, draftId, router]);

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
        <p className="text-zinc-500">{tc("error")}</p>
      </div>
    );
  }

  const d = draft.data;
  const normalizedSubject = normalizeLetterSubject(d.subject, d.locale);
  const checkoutErrorCode = getApiErrorCode(checkout.error);
  const checkoutErrorMessage =
    getApiErrorUserMessage(checkout.error) ?? (checkout.error ? t("paymentError") : null);
  const hasBlockingPricingError =
    Boolean(checkoutErrorMessage) && !checkout.pricing && !checkout.clientSecret;
  const hasBlockingStripeConfigurationError =
    checkoutErrorCode === "STRIPE_NOT_CONFIGURED" || !hasConfiguredStripeFrontend;
  const showCheckoutBlockedState =
    !checkout.clientSecret &&
    (hasBlockingPricingError || hasBlockingStripeConfigurationError);
  const checkoutBlockedTitle =
    checkoutErrorMessage ??
    (!hasConfiguredStripeFrontend ? t("paymentConfigError") : null);
  const pricingPendingMessage = canRequestQuote ? null : t("pricingPending");

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
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
      <FlowHeader currentStep={2} draftId={draftId} title={t("title")} />

      <main
        id="main-content"
        className="mx-auto grid max-w-7xl gap-6 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:pb-12 lg:grid-cols-[340px_minmax(0,1fr)]"
      >
        <aside className="space-y-4 lg:sticky lg:top-28">
          <PriceSummary
            draftId={draftId}
            deliveryType={d.deliveryType}
            subject={normalizedSubject}
            showTrustNote
            quoteEnabled={canRequestQuote}
            pendingLabel={pricingPendingMessage ?? undefined}
          />
        </aside>

        <div className="space-y-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {t("orderSummary")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 md:text-base">
              {t("checkoutIntro")}
            </p>
          </div>

          {!checkout.clientSecret && !showCheckoutBlockedState && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              <div className="app-panel rounded-3xl p-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  {t("email")}
                </label>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {t("emailHelp")}
                </p>
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
                    "app-form-control mt-3 rounded-xl border px-4 py-3 placeholder:text-zinc-400 focus:outline-none focus:ring-2 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500",
                    errors.email
                      ? "border-destructive focus:border-destructive focus:ring-destructive"
                      : "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:border-zinc-500 dark:focus:ring-zinc-700",
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
                  "app-panel rounded-3xl p-5",
                  errors.legalConsent ? "ring-1 ring-destructive" : "",
                ].join(" ")}
              >
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    {...register("legalConsent")}
                    aria-describedby={errors.legalConsent ? "consent-error" : undefined}
                    aria-invalid={errors.legalConsent ? "true" : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-amber-400 dark:focus:ring-zinc-600"
                  />
                  <span className="text-zinc-600 dark:text-zinc-300">
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

              {pricingPendingMessage ? (
                <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
                  {pricingPendingMessage}
                </p>
              ) : null}

              {checkoutErrorMessage && (
                <p role="alert" className="text-sm text-destructive">
                  {checkoutErrorMessage}
                </p>
              )}

              <FlowActionDock
                secondaryAction={
                  <ActionLink
                    href={backToReviewHref}
                    variant="secondary"
                    fullWidth
                    className="sm:flex-1"
                    leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
                  >
                    {t("backToReview")}
                  </ActionLink>
                }
                primaryAction={
                  <ActionButton
                    type="submit"
                    fullWidth
                    className="sm:flex-1"
                    disabled={
                      !isValid ||
                      hasBlockingPricingError ||
                      hasBlockingStripeConfigurationError ||
                      !canRequestQuote
                    }
                    loading={isSubmitting}
                    trailingIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
                    contentClassName="w-full"
                  >
                    {t("continueToPayment")}
                  </ActionButton>
                }
              />
            </form>
          )}

          {!checkout.clientSecret && showCheckoutBlockedState && (
            <div className="app-panel rounded-3xl p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {t("livePricingTitle")}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {checkoutBlockedTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {checkoutErrorCode === "DISPATCH_ADAPTER_NOT_CONFIGURED" ||
                checkoutErrorCode === "EPOST_API_KEY_MISSING"
                  ? t("pricingBlockedEnvironmentBody")
                  : hasBlockingStripeConfigurationError
                    ? t("paymentBlockedEnvironmentBody")
                    : t("pricingBlockedBody")}
              </p>
              <div className="mt-5">
                <ActionButton
                  fullWidth
                  variant="secondary"
                  onClick={() => router.push(`/draft/${draftId}/review`)}
                  leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
                >
                  {t("backToReview")}
                </ActionButton>
              </div>
            </div>
          )}

          {stripeOptions && stripePromise && (
            <div className="app-panel rounded-3xl p-6">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {t("enterPaymentDetails")}
              </h2>
              <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
                {t("paymentHelp")}
              </p>
              <Elements stripe={stripePromise} options={stripeOptions}>
                <StripePaymentForm
                  priceCents={checkout.pricing?.totalCents ?? 0}
                  returnUrl={returnUrl}
                  buttonLabel={t("sendMyLetter")}
                  secondaryAction={
                    <ActionLink
                      href={`/draft/${draftId}/review`}
                      variant="secondary"
                      fullWidth
                      className="sm:flex-1"
                      leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
                    >
                      {t("backToReview")}
                    </ActionLink>
                  }
                />
              </Elements>
            </div>
          )}

          {checkout.clientSecret && !stripePromise && (
            <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6">
              <p className="text-sm text-destructive">{t("paymentConfigError")}</p>
            </div>
          )}

          {!showCheckoutBlockedState ? (
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-zinc-500">
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
          ) : null}
        </div>
      </main>
    </div>
  );
}
