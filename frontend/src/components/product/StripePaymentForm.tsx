"use client";

import { type ReactNode, useEffect, useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
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
  /** Absolute URL Stripe should redirect to after successful payment. */
  returnUrl: string;
  /** Button label prefix (e.g. "Send my letter"). */
  buttonLabel: string;
  secondaryAction?: ReactNode;
}

export function StripePaymentForm({
  priceCents: _priceCents,
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
      confirmParams: { return_url: returnUrl },
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
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">{t("paymentMethodsHelp")}</p>
      {/* Stripe's PaymentElement renders card fields, TWINT, and other methods */}
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["twint", "card"],
          fields: {
            billingDetails: {
              // Email is collected separately on the checkout page
              email: "never",
            },
          },
        }}
      />

      {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}

      <FlowActionDock
        desktopSticky
        secondaryAction={secondaryAction}
        primaryAction={
          <ActionButton
            type="submit"
            fullWidth
            className="sm:flex-1"
            disabled={!stripe || !elements}
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
