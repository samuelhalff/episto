import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
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
import { Header } from "../../components/marketing/Header.js";
import { Footer } from "../../components/marketing/Footer.js";

export default function HomePage() {
  const t = useTranslations("marketing");

  const steps = [
    {
      icon: <PenLine className="h-8 w-8 text-amber-600" />,
      number: "01",
      title: t("step1Title"),
      description: t("step1Desc"),
      delay: "0.08s",
    },
    {
      icon: <FileSearch className="h-8 w-8 text-amber-600" />,
      number: "02",
      title: t("step2Title"),
      description: t("step2Desc"),
      delay: "0.16s",
    },
    {
      icon: <Send className="h-8 w-8 text-amber-600" />,
      number: "03",
      title: t("step3Title"),
      description: t("step3Desc"),
      delay: "0.24s",
    },
  ];

  const useCases = [
    {
      icon: <XCircle className="h-8 w-8 text-rose-500" />,
      label: t("useCaseCancel"),
      accent: "from-rose-50 to-white",
      delay: "0.08s",
    },
    {
      icon: <Home className="h-8 w-8 text-sky-600" />,
      label: t("useCaseLease"),
      accent: "from-sky-50 to-white",
      delay: "0.14s",
    },
    {
      icon: <FileWarning className="h-8 w-8 text-amber-600" />,
      label: t("useCaseComplaint"),
      accent: "from-amber-50 to-white",
      delay: "0.2s",
    },
    {
      icon: <Building2 className="h-8 w-8 text-stone-700" />,
      label: t("useCaseAuthority"),
      accent: "from-stone-100 to-white",
      delay: "0.26s",
    },
  ];

  const trustItems = [
    {
      icon: <Truck className="h-8 w-8 text-amber-300" />,
      label: t("trustSwissPost"),
    },
    {
      icon: <Shield className="h-8 w-8 text-amber-300" />,
      label: t("trustSecure"),
    },
    {
      icon: <UserCheck className="h-8 w-8 text-amber-300" />,
      label: t("trustNoAccount"),
    },
  ];

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero — single-column centered */}
        <section className="relative overflow-hidden px-4 pb-8 pt-12 sm:px-6 sm:pb-12 sm:pt-16 md:pb-16 md:pt-20 lg:pb-20 lg:pt-28">
          <div
            aria-hidden="true"
            className="hero-grid pointer-events-none absolute inset-x-4 top-0 -z-10 h-[82%] rounded-[2.5rem] opacity-50 md:inset-x-8 md:rounded-[3rem]"
          />
          <div
            aria-hidden="true"
            className="animate-glow-pulse pointer-events-none absolute left-1/2 top-16 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl md:top-24 md:h-72 md:w-72"
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-rise-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 shadow-[0_14px_35px_rgba(120,53,15,0.08)] sm:px-4 sm:py-2 sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t("heroPanelBadge")}
              </div>
              <h1 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-stone-950 sm:mt-5 sm:text-5xl md:mt-7 md:text-6xl lg:text-7xl">
                {t("heroTitle")}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-stone-600 sm:mt-5 sm:text-base sm:leading-7 md:mt-5 md:text-lg md:leading-8 lg:text-xl">
                {t("heroSubtitle")}
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
                <Link
                  href="/draft/new"
                  className="cta-sheen inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(28,25,23,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-stone-800 sm:w-auto sm:px-7 sm:py-4 sm:text-base"
                >
                  {t("heroCta")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/help"
                  className="inline-flex w-full items-center justify-center rounded-full border border-stone-300/70 bg-white/80 px-5 py-3.5 text-sm font-medium text-stone-700 shadow-[0_12px_30px_rgba(120,53,15,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:text-stone-950 sm:w-auto sm:px-7 sm:py-4 sm:text-base"
                >
                  {t("faqCta")}
                </Link>
              </div>
              <div className="mx-auto mt-10 max-w-xl sm:mt-14">
                <div className="paper-noise rounded-2xl border border-stone-200/60 px-4 py-4 shadow-[0_18px_50px_rgba(120,53,15,0.06)] sm:rounded-[2rem] sm:px-6 sm:py-5">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                    {trustItems.map((item, index) => (
                      <div
                        key={item.label}
                        className="animate-rise-in flex items-center gap-2.5 rounded-xl px-1 py-1 sm:justify-center sm:gap-3 sm:px-2 sm:py-1.5"
                        style={{ animationDelay: `${0.18 + index * 0.08}s` }}
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50/80 sm:h-9 sm:w-9 sm:rounded-xl">
                          {item.icon}
                        </span>
                        <span className="text-xs font-medium text-stone-600 sm:text-sm">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-stone-50/50 px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center sm:mb-12 md:mb-16">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-3xl md:text-4xl lg:text-5xl">
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
          </div>
        </section>

        {/* Use Cases */}
        <section className="px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center sm:mb-12 md:mb-16">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-3xl md:text-4xl lg:text-5xl">
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
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-stone-950 px-6 py-10 text-center text-white sm:rounded-3xl sm:px-10 md:px-16 md:py-16">
            <p className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl md:text-6xl">
              {t("pricingFrom")}
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/60 sm:mt-4 sm:text-base">
              {t("pricingNotes")}
            </p>
            <h2 className="mx-auto mt-8 max-w-3xl text-2xl font-semibold tracking-[-0.05em] sm:mt-10 sm:text-4xl md:text-5xl">
              {t("ctaTitle")}
            </h2>
            <div className="mt-8 sm:mt-10">
              <Link
                href="/draft/new"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-stone-950 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-50 sm:px-8 sm:py-4 sm:text-base"
              >
                {t("ctaButton")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
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
  delay,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <article
      className="animate-rise-in rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-7"
      style={{ animationDelay: delay } as CSSProperties}
    >
      <div className="flex items-center gap-3 sm:block">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 shadow-inner sm:h-14 sm:w-14 sm:rounded-[1.4rem]">
          {icon}
        </div>
        <div className="min-w-0 sm:mt-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-stone-950 sm:text-2xl">
              {title}
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400 sm:hidden">
              {number}
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-6 text-stone-600 sm:mt-3 sm:text-base sm:leading-7">{description}</p>
        </div>
      </div>
      <span className="mt-2 hidden text-xs font-semibold uppercase tracking-[0.24em] text-stone-400 sm:block">
        {number}
      </span>
    </article>
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
    <article
      className="animate-rise-in group rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:rounded-3xl sm:p-6"
      style={{ animationDelay: delay } as CSSProperties}
    >
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} sm:h-12 sm:w-12 sm:rounded-2xl`}>
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold tracking-[-0.03em] text-stone-950 sm:mt-6 sm:text-xl">
        {label}
      </h3>
    </article>
  );
}

function LetterLine({ width }: { width: string }) {
  return <div className="h-3 rounded-full bg-stone-900/8" style={{ width }} />;
}
