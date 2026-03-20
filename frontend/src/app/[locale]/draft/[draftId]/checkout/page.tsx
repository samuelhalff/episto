"use client";

import { use, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useDraft, useCheckout } from "../../../../../hooks/use-api.js";
import { usePricing, formatCentsAsCHF } from "../../../../../hooks/use-pricing.js";
import { Link, useRouter } from "../../../../../i18n/navigation.js";
import { Lock, Truck, ShieldCheck, Loader2, Mail } from "lucide-react";
import { DeliveryType } from "@swiss-mail/shared";
import { PriceSummary } from "../../../../../components/product/PriceSummary.js";
import { StripePaymentForm } from "../../../../../components/product/StripePaymentForm.js";
import { captureError } from "../../../../../lib/error-tracking.js";
import { Button } from "../../../../../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card.js";
import { Input } from "../../../../../components/ui/input.js";
import { Label } from "../../../../../components/ui/label.js";
import { useTheme } from "../../../../../components/ui/theme-provider.js";

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
  const { resolvedTheme } = useTheme();

  const draft = useDraft(draftId);
  const checkout = useCheckout(draftId);
  const pricing = usePricing();

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{tc("error")}</p>
      </div>
    );
  }

  const d = draft.data;
  const isRegistered = d.deliveryType === DeliveryType.registered;

  const displayPrice = pricing.data
    ? isRegistered
      ? pricing.data.registered.displayPrice
      : pricing.data.standard.displayPrice
    : formatCentsAsCHF(isRegistered ? 890 : 490);

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
    void checkout.createPaymentIntent(values.email).then((result) => {
      if (!result.clientSecret) {
        router.push(`/draft/${draftId}/confirmation`);
      }
    }).catch((err: unknown) => {
      captureError(err instanceof Error ? err : new Error(String(err)), { component: "CheckoutPage", route: `/draft/${draftId}/checkout` });
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Mail className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">{tc("appName")}</span>
          </Link>
          <span className="text-sm font-medium text-foreground">{t("title")}</span>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>

        <Card>
          <CardContent className="p-6">
            <PriceSummary deliveryType={d.deliveryType} subject={d.subject} />
          </CardContent>
        </Card>

        {/* Step 1: Email + consent */}
        {!checkout.clientSecret && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("email")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">{t("emailHelp")}</p>
                <Label htmlFor="email" className="sr-only">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={errors.email ? "true" : undefined}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="mt-1.5 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Legal consent */}
            <Card className={errors.legalConsent ? "border-destructive" : ""}>
              <CardContent className="p-5">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    {...register("legalConsent")}
                    aria-describedby={errors.legalConsent ? "consent-error" : undefined}
                    aria-invalid={errors.legalConsent ? "true" : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                  />
                  <span className="text-muted-foreground">{t("legalConsent")}</span>
                </label>
                {errors.legalConsent && (
                  <p id="consent-error" role="alert" className="mt-1.5 text-xs text-destructive">
                    {errors.legalConsent.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {checkout.error && (
              <p role="alert" className="text-sm text-destructive">{tc("error")}</p>
            )}

            <Button type="submit" disabled={!isValid || isSubmitting} size="lg" className="w-full">
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `${t("continueToPayment")} — ${displayPrice}`
              )}
            </Button>
          </form>
        )}

        {/* Step 2: Stripe */}
        {checkout.clientSecret && stripePromise && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("enterPaymentDetails")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: checkout.clientSecret,
                  locale: toStripeLocale(locale),
                  appearance: {
                    theme: resolvedTheme === "dark" ? "night" : "stripe",
                    variables: {
                      colorPrimary: "#FACC15",
                      borderRadius: "10px",
                      fontFamily: "Inter, system-ui, sans-serif",
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
            </CardContent>
          </Card>
        )}

        {checkout.clientSecret && !stripePromise && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6">
              <p className="text-sm text-destructive">{t("paymentConfigError")}</p>
            </CardContent>
          </Card>
        )}

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
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
