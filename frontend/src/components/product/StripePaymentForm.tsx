"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { StripeError } from "@stripe/stripe-js";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, Mail, ShieldCheck, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { captureError, captureMessage } from "../../lib/error-tracking";
import { ActionButton } from "./ActionButton";
import { FlowActionDock } from "./FlowActionDock";

// ---------------------------------------------------------------------------
// StripePaymentForm
// ---------------------------------------------------------------------------
// Rendered inside a Stripe <Elements> provider (which supplies clientSecret).
// Handles PaymentElement rendering, submission, and error display.
// On success, Stripe redirects to the `returnUrl` — the caller must provide
// a confirmation-page URL so the user lands there after payment authorization.
// ---------------------------------------------------------------------------

interface StripePaymentFormProps {
  /** CHF amount in cents, used to label the submit button. */
  priceCents: number;
  /** Billing email collected before the Stripe step. */
  billingEmail: string;
  /** Absolute URL Stripe should redirect to after successful payment. */
  returnUrl: string;
  /** Button label prefix (e.g. "Send my letter"). */
  buttonLabel: string;
  secondaryAction?: ReactNode;
  onLoadErrorRecovery?: (reason: StripePaymentFormLoadRecoveryReason) => void;
}

export type StripePaymentFormLoadRecoveryReason =
  | "terminal_payment_intent"
  | "payment_form_unavailable";

interface PaymentElementLoadErrorEvent {
  elementType: "payment";
  error: StripeError;
}

function isTerminalPaymentIntentLoadError(message: string): boolean {
  return (
    /terminal state/i.test(message) ||
    /cannot be used to initialize elements/i.test(message)
  );
}

export function StripePaymentForm({
  priceCents: _priceCents,
  billingEmail,
  returnUrl,
  buttonLabel,
  secondaryAction,
  onLoadErrorRecovery,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations("checkout");
  const normalizedBillingEmail = billingEmail.trim();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentElementLoadFailed, setPaymentElementLoadFailed] = useState(false);

  useEffect(() => {
    if (!isSubmitting) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitting]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements || isSubmitting || paymentElementLoadFailed) return;
    if (!normalizedBillingEmail) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    // Finalize the PaymentElement input before confirming.
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message ?? t("paymentError"));
      setIsSubmitting(false);
      return;
    }

    // Confirm the payment. Stripe will redirect to `returnUrl` on success.
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: {
            email: normalizedBillingEmail,
          },
        },
      },
      // Do not redirect automatically — let us handle it so we can show
      // an error on the same page if payment fails (e.g. declined card).
      redirect: "if_required",
    });

    if (error) {
      // Stripe provides a user-readable message for all error types.
      setErrorMessage(error.message ?? t("paymentError"));
      setIsSubmitting(false);
    }
    // If no error and redirect: "if_required" → payment succeeded without redirect.
    // The caller's returnUrl logic will still fire via Stripe webhook; for UI, we
    // trigger the redirect ourselves.
    if (!error) {
      window.location.href = returnUrl;
    }
  }

  function handleLoadError(loadErrorEvent: PaymentElementLoadErrorEvent) {
    const message = loadErrorEvent.error.message ?? t("paymentError");
    const recoveryReason: StripePaymentFormLoadRecoveryReason = isTerminalPaymentIntentLoadError(message)
      ? "terminal_payment_intent"
      : "payment_form_unavailable";
    const context = {
      component: "StripePaymentForm",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      extra: {
        elementType: loadErrorEvent.elementType,
        stripeCode: loadErrorEvent.error.code ?? "unknown",
        stripeType: loadErrorEvent.error.type ?? "unknown",
      },
    };

    setPaymentElementLoadFailed(true);
    setErrorMessage(message);
    if (recoveryReason === "terminal_payment_intent") {
      // Stripe emits this when the PaymentIntent has already moved out of a
      // collectable state before Elements mounts. Clearing the client secret
      // lets checkout recreate a fresh payment session on the next attempt.
      captureMessage(
        "Stripe PaymentElement rejected a terminal PaymentIntent during checkout mount",
        "warning",
        context,
      );
    } else {
      captureError(new Error(message), context);
      captureMessage(
        "Stripe PaymentElement load error did not match terminal-intent recovery",
        "warning",
        context,
      );
    }
    // Any PaymentElement load failure leaves the current Elements mount unusable.
    // Drop back to the checkout step so the user can request a fresh session.
    onLoadErrorRecovery?.(recoveryReason);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="app-panel-muted overflow-hidden rounded-[2rem] p-3 sm:p-4">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="app-list-item-muted inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-[var(--app-muted)]">
            <Lock className="h-3.5 w-3.5 text-[var(--app-muted-strong)]" />
            {t("secureCheckout")}
          </span>
          <p className="max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
            {t("paymentHelp")}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-[1.5rem] bg-[var(--app-surface-strong)]/80 p-2 sm:p-3 dark:bg-[var(--app-surface-soft)]/90">
            <div>
              <p className="section-label">{t("enterPaymentDetails")}</p>
              <p className="mb-4 mt-2 text-sm leading-6 text-[var(--app-muted)]">
                {t("paymentMethodsHelp")}
              </p>
            </div>

            <div className="rounded-[1.35rem] bg-white/88 p-1.5 ring-1 ring-black/5 dark:bg-[rgba(13,17,23,0.44)] dark:ring-white/8 sm:p-2">
              {/* Stripe's PaymentElement renders card fields, TWINT, and other supported methods. */}
              <PaymentElement
                key={normalizedBillingEmail || "checkout-payment"}
                options={{
                  business: { name: "Sendly" },
                  defaultValues: {
                    billingDetails: {
                      email: normalizedBillingEmail,
                    },
                  },
                  layout: {
                    type: "accordion",
                    defaultCollapsed: false,
                    spacedAccordionItems: false,
                  },
                  paymentMethodOrder: ["twint", "card", "apple_pay", "google_pay"],
                  fields: {
                    billingDetails: {
                      // Email is collected separately on the checkout page
                      email: "never",
                    },
                  },
                }}
                onLoadError={handleLoadError}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="app-list-item-muted rounded-2xl p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--app-surface-strong)] text-[var(--app-muted-strong)]">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="section-label">{t("email")}</p>
                  <p className="mt-2 break-all text-sm font-medium text-[var(--app-fg)]">
                    {normalizedBillingEmail}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
                    {t("emailHelp")}
                  </p>
                </div>
              </div>
            </div>

            <div className="app-list-item-muted rounded-2xl p-3 sm:p-4">
              <p className="section-label">{t("secureCheckout")}</p>
              <ul className="mt-3 space-y-2 text-xs text-[var(--app-muted)]">
                <li className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-[var(--app-muted-strong)]" />
                  <span>{t("securedByStripe")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-[var(--app-muted-strong)]" />
                  <span>{t("swissDelivery")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--app-muted-strong)]" />
                  <span>{t("dataProtection")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="app-list-item-muted rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <FlowActionDock
        desktopSticky
        secondaryAction={secondaryAction}
        primaryAction={
          <ActionButton
            type="submit"
            fullWidth
            desktopMinWidth
            disabled={
              !stripe || !elements || !normalizedBillingEmail || paymentElementLoadFailed
            }
            loading={isSubmitting}
            contentClassName="w-full"
          >
            {isSubmitting ? t("paymentConfirming") : buttonLabel}
          </ActionButton>
        }
      />
    </form>
  );
}
