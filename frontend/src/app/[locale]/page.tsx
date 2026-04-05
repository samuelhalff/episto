import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Building2,
  FileWarning,
  Home,
  PenLine,
  FileSearch,
  Send,
  Shield,
  Sparkles,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { FinalCTABand } from "../../components/marketing/FinalCTABand";
import { MarketingLayout } from "../../components/marketing/MarketingLayout";
import { PricingFromText } from "../../components/marketing/PricingFromText";
import {
  MarketingActionLink,
  MarketingBadge,
  MarketingCard,
  MarketingSection,
} from "../../components/marketing/primitives";

export default function HomePage() {
  const t = useTranslations("marketing");

  const steps = [
    {
      icon: <PenLine className="h-8 w-8 text-zinc-600 dark:text-zinc-300" />,
      number: "01",
      title: t("step1Title"),
      description: t("step1Desc"),
      delay: "0.08s",
    },
    {
      icon: <FileSearch className="h-8 w-8 text-zinc-600 dark:text-zinc-300" />,
      number: "02",
      title: t("step2Title"),
      description: t("step2Desc"),
      delay: "0.16s",
    },
    {
      icon: <Send className="h-8 w-8 text-zinc-600 dark:text-zinc-300" />,
      number: "03",
      title: t("step3Title"),
      description: t("step3Desc"),
      delay: "0.24s",
    },
  ];

  const useCases = [
    {
      icon: <XCircle className="h-8 w-8 text-rose-500 dark:text-rose-400" />,
      label: t("useCaseCancel"),
      accent: "from-rose-50 to-white dark:from-rose-950/40 dark:to-transparent",
      delay: "0.08s",
    },
    {
      icon: <Home className="h-8 w-8 text-sky-600 dark:text-sky-400" />,
      label: t("useCaseLease"),
      accent: "from-sky-50 to-white dark:from-sky-950/40 dark:to-transparent",
      delay: "0.14s",
    },
    {
      icon: <FileWarning className="h-8 w-8 text-amber-600 dark:text-amber-400" />,
      label: t("useCaseComplaint"),
      accent: "from-amber-50 to-white dark:from-amber-950/40 dark:to-transparent",
      delay: "0.2s",
    },
    {
      icon: <Building2 className="h-8 w-8 text-zinc-700 dark:text-zinc-300" />,
      label: t("useCaseAuthority"),
      accent: "from-zinc-100 to-white dark:from-zinc-800/60 dark:to-transparent",
      delay: "0.26s",
    },
  ];

  const trustItems = [
    {
      icon: <Truck className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />,
      label: t("trustSwissPost"),
    },
    {
      icon: <Shield className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />,
      label: t("trustSecure"),
    },
    {
      icon: <UserCheck className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />,
      label: t("trustNoAccount"),
    },
  ];

  return (
    <MarketingLayout mainClassName="transition-colors dark:text-zinc-50">
      {/* Hero — single-column centered */}
      <section className="relative overflow-hidden px-4 pb-8 pt-12 sm:px-6 sm:pb-12 sm:pt-16 md:pb-16 md:pt-20 lg:pb-20 lg:pt-28">
        <div
          aria-hidden="true"
          className="hero-grid pointer-events-none absolute inset-x-4 top-0 -z-10 h-[70%] rounded-[2.5rem] opacity-30 md:inset-x-8 md:rounded-[3rem]"
        />
        <div
          aria-hidden="true"
          className="animate-glow-pulse pointer-events-none absolute left-1/2 top-16 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-zinc-300/30 blur-3xl dark:bg-amber-500/10 md:top-24 md:h-72 md:w-72"
        />
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-rise-in">
            <MarketingBadge className="text-zinc-600 dark:text-zinc-200">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t("heroPanelBadge")}
            </MarketingBadge>
            <h1 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:mt-5 sm:text-5xl md:mt-7 md:text-6xl lg:text-7xl">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:mt-5 sm:text-base sm:leading-7 md:mt-5 md:text-lg md:leading-8 lg:text-xl">
              {t("heroSubtitle")}
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
              <MarketingActionLink
                href="/draft/new"
                className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
              >
                {t("heroCta")}
                <ArrowRight className="h-4 w-4" />
              </MarketingActionLink>
              <MarketingActionLink
                href="/help"
                variant="secondary"
                className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
              >
                {t("faqCta")}
              </MarketingActionLink>
            </div>
            <div className="mx-auto mt-10 max-w-xl sm:mt-14">
              <MarketingCard className="rounded-3xl px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                  {trustItems.map((item, index) => (
                    <div
                      key={item.label}
                      className="animate-rise-in flex items-center gap-2.5 rounded-xl px-1 py-1 sm:justify-center sm:gap-3 sm:px-2 sm:py-1.5"
                      style={{ animationDelay: `${0.18 + index * 0.08}s` }}
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 sm:h-10 sm:w-10">
                        {item.icon}
                      </span>
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 sm:text-sm">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </MarketingCard>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <MarketingSection muted>
        <div className="mb-10 text-center sm:mb-12 md:mb-16">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-4xl lg:text-5xl">
            {t("howItWorksTitle")}
          </h2>
        </div>
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {steps.map((step) => (
            <StepCard
              key={step.number}
              icon={step.icon}
              number={step.number}
              title={step.title}
              description={step.description}
              delay={step.delay}
            />
          ))}
        </div>
      </MarketingSection>

      {/* Use Cases */}
      <MarketingSection>
        <div className="mb-10 text-center sm:mb-12 md:mb-16">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-4xl lg:text-5xl">
            {t("useCasesTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {useCases.map((useCase) => (
            <UseCaseCard
              key={useCase.label}
              icon={useCase.icon}
              label={useCase.label}
              accent={useCase.accent}
              delay={useCase.delay}
            />
          ))}
        </div>
      </MarketingSection>

      {/* Final CTA */}
      <MarketingSection>
        <FinalCTABand
          title={t("ctaTitle")}
          body={
            <PricingFromText
              titleClassName="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl md:text-6xl"
              noteClassName="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/70 sm:mt-4 sm:text-base"
            />
          }
          primaryAction={{ href: "/draft/new", label: t("ctaButton") }}
        />
      </MarketingSection>
    </MarketingLayout>
  );
}

function StepCard({
  icon,
  number,
  title,
  description,
  delay,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <MarketingCard
      className="animate-rise-in rounded-2.5xl p-5 sm:rounded-3xl sm:p-7"
      style={
        { animationDelay: delay, outline: "1px solid var(--app-border)" } as CSSProperties
      }
    >
      <div className="flex items-center gap-3 sm:block">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 sm:h-14 sm:w-14">
          {icon}
        </div>
        <div className="min-w-0 sm:mt-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50 sm:text-2xl">
              {title}
            </h3>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 sm:hidden">
              {number}
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:mt-3 sm:text-base sm:leading-7">
            {description}
          </p>
        </div>
      </div>
      <span className="mt-2 hidden text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 sm:block">
        {number}
      </span>
    </MarketingCard>
  );
}

function UseCaseCard({
  icon,
  label,
  accent,
  delay,
}: {
  icon: ReactNode;
  label: string;
  accent: string;
  delay: string;
}) {
  return (
    <MarketingCard
      className="animate-rise-in group rounded-2.5xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:rounded-3xl sm:p-6"
      style={
        { animationDelay: delay, outline: "1px solid var(--app-border)" } as CSSProperties
      }
    >
      <div
        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} sm:h-14 sm:w-14`}
      >
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50 sm:mt-6 sm:text-xl">
        {label}
      </h3>
    </MarketingCard>
  );
}
