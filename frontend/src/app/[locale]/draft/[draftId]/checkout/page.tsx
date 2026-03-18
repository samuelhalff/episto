"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { useDraft } from "../../../../../hooks/use-api.js";
import { Link, useRouter } from "../../../../../i18n/navigation.js";
import {
  CreditCard,
  Lock,
  Truck,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { DeliveryType } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Checkout Page
// ---------------------------------------------------------------------------

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const router = useRouter();

  const draft = useDraft(draftId);

  const [email, setEmail] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = email.includes("@") && legalConsent;

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
  const price =
    d.deliveryType === DeliveryType.registered ? "7.90" : "2.90";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    // Placeholder: real flow would create PaymentIntent, confirm via Stripe,
    // then redirect on success
    setTimeout(() => {
      router.push(`/draft/${draftId}/confirmation`);
    }, 1500);
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              {t("orderSummary")}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{d.subject ?? "Letter"}</span>
                <span className="font-medium">CHF {price}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span>CHF {price}</span>
                </div>
              </div>
            </div>
          </div>

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
            />
          </div>

          {/* Payment (placeholder) */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              {t("paymentMethod")}
            </h2>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 text-sm text-gray-400">
              <div className="text-center">
                <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p>{t("paymentPending")}</p>
                <p className="mt-1 text-xs">
                  Stripe integration pending
                </p>
              </div>
            </div>
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

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full rounded-lg bg-navy py-3.5 text-sm font-semibold text-white transition hover:bg-navy-light disabled:opacity-40"
          >
            {isSubmitting ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              `${t("sendMyLetter")} — CHF ${price}`
            )}
          </button>

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
        </form>
      </main>
    </div>
  );
}
