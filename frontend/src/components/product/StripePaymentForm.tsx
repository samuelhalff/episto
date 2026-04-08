"use client";

import { type ReactNode, useEffect, useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock, Mail, ShieldCheck, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
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
}

export function StripePaymentForm({
  priceCents: _priceCents,
  billingEmail,
  returnUrl,
  buttonLabel,
  secondaryAction,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations("checkout");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!stripe || !elements || isSubmitting) return;

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
            email: billingEmail,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="app-panel-muted rounded-[2rem] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="app-list-item-muted inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-[var(--app-muted)]">
            <Lock className="h-3.5 w-3.5 text-[var(--app-muted-strong)]" />
            {t("secureCheckout")}
          </span>
          <p className="text-sm text-[var(--app-muted)]">{t("paymentHelp")}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div>
              <p className="section-label">{t("enterPaymentDetails")}</p>
              <p className="mb-3 text-xs text-[var(--app-muted)] sm:text-sm">
                {t("paymentMethodsHelp")}
              </p>
            </div>

            <div className="app-list-item-muted rounded-[28px] p-3 sm:p-4">
              {/* Stripe's PaymentElement renders card fields, TWINT, and other supported methods. */}
              <PaymentElement
                options={{
                  business: { name: "Swiss Mail" },
                  layout: { type: "tabs", defaultCollapsed: false },
                  paymentMethodOrder: ["twint", "card"],
                  fields: {
                    billingDetails: {
                      // Email is collected separately on the checkout page
                      email: "never",
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="app-list-item-muted rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--app-surface-strong)] text-[var(--app-muted-strong)]">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="section-label">{t("email")}</p>
                  <p className="mt-2 break-all text-sm font-medium text-[var(--app-fg)]">
                    {billingEmail}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
                    {t("emailHelp")}
                  </p>
                </div>
              </div>
            </div>

            <div className="app-list-item-muted rounded-2xl p-4">
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
            className="sm:flex-1"
            disabled={!stripe || !elements || !billingEmail.trim()}
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
