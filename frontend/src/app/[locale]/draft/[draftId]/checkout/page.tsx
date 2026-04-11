"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useDraft, useCheckout, useSession } from "@/hooks/use-api";
import { Link, useRouter } from "@/i18n/navigation";
import { Lock, Truck, ShieldCheck, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { FlowHeader } from "@/components/product/FlowHeader";
import { FlowActionDock } from "@/components/product/FlowActionDock";
import { PriceSummary } from "@/components/product/PriceSummary";
import {
  StripePaymentForm,
  type StripePaymentFormLoadRecoveryReason,
} from "@/components/product/StripePaymentForm";
import { ActionButton, ActionLink } from "@/components/product/ActionButton";
import { captureException } from "@/lib/error-tracking";
import { normalizeLetterSubject } from "@/lib/letter-content";
import { env } from "@/lib/env";
import { getApiErrorCode, getApiErrorUserMessage } from "@/lib/api";
import { getCustomerFlowBackPath } from "@/lib/customer-flow";
import { useTheme } from "@/lib/theme";

const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const STRIPE_LOCALE_MAP: Record<string, "de" | "fr" | "it" | "en"> = {
  "de-CH": "de",
  "fr-CH": "fr",
  "it-CH": "it",
  "en-CH": "en",
};

function toStripeLocale(locale: string): "de" | "fr" | "it" | "en" {
  return STRIPE_LOCALE_MAP[locale] ?? "de";
}

function getStripeAppearance(theme: "light" | "dark") {
  return {
    theme: (theme === "dark" ? "night" : "flat") as "night" | "flat",
    labels: "floating" as const,
    variables: {
      // Must match --action-primary-bg in globals.css. Stripe requires literal values here.
      colorPrimary: "#f6c54a",
      colorBackground: theme === "dark" ? "#10161f" : "#faf8f3",
      colorText: theme === "dark" ? "#e6edf3" : "#18181b",
      colorTextSecondary: theme === "dark" ? "#9ea7b3" : "#5f5f67",
      colorTextPlaceholder: theme === "dark" ? "#6e7681" : "#8a8a93",
      colorDanger: theme === "dark" ? "#f87171" : "#dc2626",
      borderRadius: "16px",
      fontSizeBase: "16px",
      fontFamily:
        "\"Ideal Sans\", \"Inter\", system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      fontWeightMedium: "600",
      fontWeightBold: "700",
      spacingUnit: "4px",
      gridRowSpacing: "14px",
      tabSpacing: "8px",
      focusBoxShadow:
        theme === "dark"
          ? "0 0 0 4px rgba(246, 197, 74, 0.18)"
          : "0 0 0 4px rgba(246, 197, 74, 0.22)",
      logoColor: theme === "dark" ? "light" : "dark",
      tabLogoColor: theme === "dark" ? "light" : "dark",
      tabLogoSelectedColor: theme === "dark" ? "light" : "dark",
    },
    rules: {
      ".Block": {
        backgroundColor: theme === "dark" ? "#111822" : "#fffefb",
        border: `1px solid ${theme === "dark" ? "rgba(177, 186, 196, 0.14)" : "rgba(15, 23, 42, 0.06)"}`,
        boxShadow: "none",
      },
      ".Input": {
        backgroundColor: theme === "dark" ? "#111822" : "#ffffff",
        border: `1px solid ${theme === "dark" ? "rgba(177, 186, 196, 0.14)" : "rgba(15, 23, 42, 0.07)"}`,
        boxShadow: "none",
      },
      ".AccordionItem": {
        backgroundColor: "transparent",
        border: "0px solid transparent",
        boxShadow: "none",
      },
      ".AccordionItem:hover": {
        color: theme === "dark" ? "#e6edf3" : "#18181b",
      },
      ".Label": {
        fontWeight: "600",
      },
    },
  };
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
  const { theme } = useTheme();
  const session = useSession();
  const [submittedCheckoutEmail, setSubmittedCheckoutEmail] = useState<string | null>(null);
  const [paymentRecoveryMessage, setPaymentRecoveryMessage] = useState<string | null>(null);

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
  const backToReviewHref =
    getCustomerFlowBackPath(draftId, "checkout") ?? `/draft/${draftId}/review`;
  const billingEmail = submittedCheckoutEmail ?? session.session?.email ?? "";

  const isSubmitting = checkout.isProcessing;

  const stripeOptions = useMemo(
    () =>
      checkout.clientSecret
        ? {
            clientSecret: checkout.clientSecret,
            locale: toStripeLocale(locale),
            appearance: getStripeAppearance(theme),
          }
        : null,
    [checkout.clientSecret, locale, theme],
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
  const hasBlockingStripeConfigurationError = checkoutErrorCode === "STRIPE_NOT_CONFIGURED";
  const showCheckoutBlockedState =
    !checkout.clientSecret &&
    (hasBlockingPricingError || hasBlockingStripeConfigurationError);
  const checkoutBlockedTitle =
    checkoutErrorMessage ??
    (hasBlockingStripeConfigurationError ? t("paymentConfigError") : null);
  const pricingPendingMessage = canRequestQuote ? null : t("pricingPending");
  const isPricingPending = Boolean(pricingPendingMessage);

  function onSubmit(values: CheckoutFormValues) {
    if (isSubmitting) return;
    setPaymentRecoveryMessage(null);
    setSubmittedCheckoutEmail(values.email);
    void checkout
      .createPaymentIntent(values.email)
      .then((result) => {
        if (!result.clientSecret) {
          router.push(`/draft/${draftId}/confirmation`);
        }
      })
      .catch((err: unknown) => {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          component: "CheckoutPage",
          route: `/draft/${draftId}/checkout`,
        });
      });
  }

  function handlePaymentLoadErrorRecovery(reason: StripePaymentFormLoadRecoveryReason) {
    checkout.resetClientSecret();
    setPaymentRecoveryMessage(
      reason === "terminal_payment_intent"
        ? t("paymentSessionExpired")
        : t("paymentFormUnavailable"),
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
      <FlowHeader currentStep={2} draftId={draftId} title={t("title")} />

      <main
        id="main-content"
        className="mx-auto grid max-w-7xl gap-6 px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:pb-12 lg:grid-cols-[340px_minmax(0,1fr)]"
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
          <div className="w-full max-w-none">
            <p className="section-label">{t("orderSummary")}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-fg)] md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--app-muted)] md:text-base">
              {t("checkoutIntro")}
            </p>
          </div>

          {!checkout.clientSecret && !showCheckoutBlockedState && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              <div className="app-panel rounded-3xl p-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-[var(--app-fg)]"
                >
                  {t("email")}
                </label>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{t("emailHelp")}</p>
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
                    "app-form-control mt-3 w-full rounded-xl border bg-[var(--app-surface-strong)] px-4 py-3 text-[var(--app-fg)] placeholder:text-[var(--app-muted)] transition-[border-color,box-shadow,background-color,color] focus:outline-none focus:ring-2",
                    errors.email
                      ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                      : "border-[var(--app-border)] focus:border-[var(--app-border-strong)] focus:ring-amber-200/60 dark:focus:ring-amber-300/20",
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
                  "app-list-item-muted rounded-2xl p-4 sm:p-5",
                  errors.legalConsent ? "ring-1 ring-destructive" : "",
                ].join(" ")}
              >
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    {...register("legalConsent")}
                    aria-describedby={errors.legalConsent ? "consent-error" : undefined}
                    aria-invalid={errors.legalConsent ? "true" : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--app-border-strong)] bg-[var(--app-surface-strong)] text-primary focus:ring-amber-200/60 dark:focus:ring-amber-300/20"
                  />
                  <span className="text-[var(--app-muted-strong)]">
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
                <p role="status" className="text-sm text-[var(--app-muted)]">
                  {pricingPendingMessage}
                </p>
              ) : null}

              {paymentRecoveryMessage && (
                <p role="alert" className="text-sm text-destructive">
                  {paymentRecoveryMessage}
                </p>
              )}

              {checkoutErrorMessage && (
                <p role="alert" className="text-sm text-destructive">
                  {checkoutErrorMessage}
                </p>
              )}

              <FlowActionDock
                desktopSticky
                secondaryAction={
                  <ActionLink
                    href={backToReviewHref}
                    variant="secondary"
                    fullWidth
                    desktopMinWidth
                    leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
                  >
                    {t("backToReview")}
                  </ActionLink>
                }
                primaryAction={
                  <ActionButton
                    type="submit"
                    fullWidth
                    desktopMinWidth
                    disabled={
                      !isValid ||
                      hasBlockingPricingError ||
                      hasBlockingStripeConfigurationError ||
                      !canRequestQuote
                    }
                    loading={isSubmitting || isPricingPending}
                    trailingIcon={
                      isPricingPending ? undefined : (
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      )
                    }
                    contentClassName="w-full"
                  >
                    {isPricingPending ? t("calculatingPayment") : t("continueToPayment")}
                  </ActionButton>
                }
              />
            </form>
          )}

          {!checkout.clientSecret && showCheckoutBlockedState && (
            <div className="app-panel-muted rounded-[2rem] p-4 sm:p-5">
              <p className="section-label">{t("livePricingTitle")}</p>
              <h2 className="mt-3 text-xl font-semibold text-[var(--app-fg)]">
                {checkoutBlockedTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
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

          {stripeOptions && (
            <Elements stripe={stripePromise} options={stripeOptions}>
              <StripePaymentForm
                priceCents={checkout.pricing?.totalCents ?? 0}
                billingEmail={billingEmail}
                returnUrl={returnUrl}
                buttonLabel={t("sendMyLetter")}
                onLoadErrorRecovery={handlePaymentLoadErrorRecovery}
                secondaryAction={
                  <ActionLink
                    href={backToReviewHref}
                    variant="secondary"
                    fullWidth
                    desktopMinWidth
                    leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
                  >
                    {t("backToReview")}
                  </ActionLink>
                }
              />
            </Elements>
          )}

          {!showCheckoutBlockedState ? (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="app-list-item-muted inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-[var(--app-muted)]">
                <Lock className="h-3.5 w-3.5 text-[var(--app-muted-strong)]" />
                {t("securedByStripe")}
              </span>
              <span className="app-list-item-muted inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-[var(--app-muted)]">
                <Truck className="h-3.5 w-3.5 text-[var(--app-muted-strong)]" />
                {t("swissDelivery")}
              </span>
              <span className="app-list-item-muted inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-[var(--app-muted)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--app-muted-strong)]" />
                {t("dataProtection")}
              </span>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
