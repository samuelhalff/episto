import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation.js";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { Check, ArrowRight, Shield } from "lucide-react";

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Heading */}
        <section className="relative px-6 pb-16 pt-20 md:pt-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-20 dark:opacity-10"
          />
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4">
              <Shield className="mr-1.5 h-3 w-3" />
              {t("noHiddenFees")}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="px-6 pb-20">
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            {/* Standard */}
            <Card className="relative overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">{t("standardLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-extrabold text-foreground">
                  {t("standardPrice")}
                </p>
                <ul className="mt-6 space-y-3">
                  <PricingFeature label={t("basePriceLabel")} value={t("basePrice")} />
                  <PricingFeature label={t("additionalPageLabel")} value={t("additionalPagePrice")} />
                  <PricingFeature label={t("attachmentLabel")} value={t("attachmentPrice")} />
                </ul>
                <Button asChild variant="outline" className="mt-8 w-full">
                  <Link href="/draft/new">
                    {t("cta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Registered */}
            <Card className="relative overflow-hidden border-primary shadow-lg">
              <div className="absolute right-4 top-4">
                <Badge>{t("popularBadge", { defaultValue: "Popular" })}</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{t("registeredLabel")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-extrabold text-foreground">
                  {t("registeredPrice")}
                </p>
                <ul className="mt-6 space-y-3">
                  <PricingFeature label={t("basePriceLabel")} value={t("basePrice")} />
                  <PricingFeature label={t("additionalPageLabel")} value={t("additionalPagePrice")} />
                  <PricingFeature label={t("attachmentLabel")} value={t("attachmentPrice")} />
                  <PricingFeature label={t("trackingLabel", { defaultValue: "Delivery tracking" })} value={t("includedLabel", { defaultValue: "Included" })} highlight />
                </ul>
                <Button asChild className="mt-8 w-full">
                  <Link href="/draft/new">
                    {t("cta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-muted/30 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              {t("ctaTitle", { defaultValue: "Ready to send your letter?" })}
            </h2>
            <Button asChild size="xl" className="mt-8">
              <Link href="/draft/new">
                {t("cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function PricingFeature({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Check className="h-4 w-4 text-success" />
        {label}
      </span>
      <span className={highlight ? "font-semibold text-primary" : "font-medium text-foreground"}>
        {value}
      </span>
    </li>
  );
}
