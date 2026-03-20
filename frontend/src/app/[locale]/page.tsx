import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "../../i18n/navigation.js";
import { Header } from "../../components/marketing/Header.js";
import { Footer } from "../../components/marketing/Footer.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { Badge } from "../../components/ui/badge.js";
import {
  PenLine,
  FileSearch,
  Send,
  XCircle,
  Home,
  FileWarning,
  Building2,
  Truck,
  Shield,
  UserCheck,
  ArrowRight,
  Sparkles,
  Zap,
  Check,
} from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });
  return {
    title: t("metaTitle", { defaultValue: "Swiss Mail — Send formal letters via Swiss Post" }),
    description: t("metaDescription", { defaultValue: "Draft and send formal letters via Swiss Post with AI assistance. Standard from CHF 4.90." }),
  };
}

export default function HomePage() {
  const t = useTranslations("marketing");

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pb-24 pt-28 md:pb-36 md:pt-44">
          {/* Background effects */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <div className="h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5" />
            </div>
            <div className="absolute inset-0 bg-grid opacity-30 dark:opacity-10" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5 text-xs">
              <Sparkles className="h-3 w-3" />
              {t("heroBadge", { defaultValue: "AI-powered letter writing" })}
            </Badge>

            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl">
              {t("heroTitle")}
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              {t("heroSubtitle")}
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/draft/new" className="gap-2">
                  {t("heroCta")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/how-it-works">
                  {t("nav.howItWorks")}
                </Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {t("trustSwissPost")}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {t("trustSecure")}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {t("trustNoAccount")}
              </span>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-muted/30 px-6 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <Badge variant="outline" className="mb-4">
                <Zap className="mr-1.5 h-3 w-3" />
                {t("howItWorksTitle")}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t("howItWorksSectionTitle", { defaultValue: "Three simple steps" })}
              </h2>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <StepCard
                icon={<PenLine className="h-6 w-6" />}
                number="01"
                title={t("step1Title")}
                description={t("step1Desc")}
              />
              <StepCard
                icon={<FileSearch className="h-6 w-6" />}
                number="02"
                title={t("step2Title")}
                description={t("step2Desc")}
              />
              <StepCard
                icon={<Send className="h-6 w-6" />}
                number="03"
                title={t("step3Title")}
                description={t("step3Desc")}
              />
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="px-6 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t("useCasesTitle")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                {t("useCasesSubtitle", { defaultValue: "From cancellations to formal notices — Swiss Mail handles it all." })}
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <UseCaseCard
                icon={<XCircle className="h-5 w-5" />}
                label={t("useCaseCancel")}
              />
              <UseCaseCard
                icon={<Home className="h-5 w-5" />}
                label={t("useCaseLease")}
              />
              <UseCaseCard
                icon={<FileWarning className="h-5 w-5" />}
                label={t("useCaseComplaint")}
              />
              <UseCaseCard
                icon={<Building2 className="h-5 w-5" />}
                label={t("useCaseAuthority")}
              />
            </div>
          </div>
        </section>

        {/* Trust signals */}
        <section className="border-t border-border bg-foreground px-6 py-24 dark:bg-card md:py-32">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-background dark:text-foreground md:text-4xl">
              {t("trustTitle")}
            </h2>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              <TrustItem
                icon={<Truck className="h-8 w-8 text-primary" />}
                label={t("trustSwissPost")}
              />
              <TrustItem
                icon={<Shield className="h-8 w-8 text-primary" />}
                label={t("trustSecure")}
              />
              <TrustItem
                icon={<UserCheck className="h-8 w-8 text-primary" />}
                label={t("trustNoAccount")}
              />
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section className="px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4">
              {t("pricingBadge", { defaultValue: "Transparent pricing" })}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t("pricingTitle")}
            </h2>
            <p className="mt-8 text-5xl font-extrabold tracking-tight text-foreground md:text-6xl">
              {t("pricingFrom")}
            </p>
            <p className="mt-4 text-muted-foreground">{t("pricingNotes")}</p>
            <Button asChild variant="outline" size="lg" className="mt-8">
              <Link href="/pricing">
                {t("nav.pricing")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-border bg-foreground px-6 py-24 dark:bg-card md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-background dark:text-foreground md:text-4xl">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground/80 dark:text-muted-foreground">
              {t("ctaSubtitle", { defaultValue: "No account needed. Start writing your letter now." })}
            </p>
            <Button asChild size="xl" className="mt-8">
              <Link href="/draft/new">
                {t("ctaButton")}
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

function StepCard({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="group relative overflow-hidden hover:shadow-md">
      <CardContent className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {icon}
          </div>
          <span className="text-4xl font-extrabold text-muted-foreground/20">
            {number}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function UseCaseCard({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Card className="group cursor-default hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function TrustItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background/10 dark:bg-muted">
        {icon}
      </div>
      <span className="mt-4 text-sm font-medium text-background/80 dark:text-foreground/80">
        {label}
      </span>
    </div>
  );
}
