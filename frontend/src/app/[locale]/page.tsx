import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { Header } from "../../components/marketing/Header.js";
import { Footer } from "../../components/marketing/Footer.js";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSearch,
  FileWarning,
  Home,
  PenLine,
  Send,
  Shield,
  Sparkles,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";

export default function HomePage() {
  const t = useTranslations("marketing");
  const tCheckout = useTranslations("checkout");
  const tReview = useTranslations("review");

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
      detail: t("step3Desc"),
    },
    {
      icon: <Shield className="h-8 w-8 text-amber-300" />,
      label: t("trustSecure"),
      detail: tCheckout("paymentHelp"),
    },
    {
      icon: <UserCheck className="h-8 w-8 text-amber-300" />,
      label: t("trustNoAccount"),
      detail: t("step1Desc"),
    },
  ];

  return (
    <>
      <Header />
      <main id="main-content">
        <section className="relative overflow-hidden px-6 pb-24 pt-16 md:pb-28 md:pt-20 lg:pb-20 lg:pt-28">
          <div
            aria-hidden="true"
            className="hero-grid pointer-events-none absolute inset-x-4 top-0 -z-10 h-[82%] rounded-[2.5rem] opacity-50 md:inset-x-8 md:rounded-[3rem]"
          />
          <div
            aria-hidden="true"
            className="animate-glow-pulse pointer-events-none absolute left-1/2 top-16 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl md:top-24 md:h-72 md:w-72"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div className="animate-rise-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 shadow-[0_14px_35px_rgba(120,53,15,0.08)]">
                <Sparkles className="h-4 w-4" />
                {t("trustSwissPost")}
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-stone-950 sm:text-5xl md:mt-7 md:text-6xl lg:text-7xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 md:mt-6 md:text-lg md:leading-8 lg:text-xl">
                {t("heroSubtitle")}
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/draft/new"
                  className="cta-sheen inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3.5 text-base font-semibold text-white shadow-[0_20px_50px_rgba(28,25,23,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-stone-800 md:px-7 md:py-4"
                >
                  {t("heroCta")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-300/70 bg-white/80 px-6 py-3.5 text-base font-medium text-stone-700 shadow-[0_12px_30px_rgba(120,53,15,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:text-stone-950 md:px-7 md:py-4"
                >
                  {t("nav.howItWorks")}
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {trustItems.map((item, index) => (
                  <div
                    key={item.label}
                    className="animate-rise-in rounded-[1.5rem] border border-white/70 bg-white/75 px-4 py-4 shadow-[0_18px_40px_rgba(120,53,15,0.08)] backdrop-blur"
                    style={{ animationDelay: `${0.18 + index * 0.08}s` }}
                  >
                    <div className="flex items-center gap-3 text-sm font-medium text-stone-700">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[34rem] lg:min-h-[40rem]">
              <div className="paper-noise relative w-full rounded-[2rem] border border-white/80 p-5 shadow-[0_28px_70px_rgba(120,53,15,0.16)] md:p-6 lg:absolute lg:right-0 lg:top-6 lg:max-w-[32rem] lg:animate-float-slow lg:shadow-[0_35px_90px_rgba(120,53,15,0.18)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                      {t("step1Title")}
                    </p>
                    <h2 className="mt-3 max-w-sm text-2xl font-semibold tracking-[-0.04em] text-stone-950 md:text-3xl">
                      {t("heroTitle")}
                    </h2>
                  </div>
                  <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    AI
                  </div>
                </div>
                <div className="mt-8 space-y-4 text-sm text-stone-500">
                  <LetterLine width="78%" />
                  <LetterLine width="93%" />
                  <LetterLine width="88%" />
                  <LetterLine width="70%" />
                </div>
                <div className="mt-8 rounded-[1.5rem] bg-stone-950 px-5 py-4 text-white shadow-[0_20px_60px_rgba(28,25,23,0.18)]">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-stone-300">
                    <span>{t("step3Title")}</span>
                    <span>{t("pricingFrom")}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      eyebrow={tReview("deliveryRegistered")}
                      value={t("trustSwissPost")}
                    />
                    <MetricCard
                      eyebrow={tCheckout("securedByStripe")}
                      value={t("trustSecure")}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.6rem] border border-stone-200/80 bg-white/92 p-5 shadow-[0_18px_45px_rgba(120,53,15,0.12)] lg:absolute lg:-left-2 lg:bottom-10 lg:mt-0 lg:max-w-[18rem] lg:animate-float-reverse lg:rounded-[1.75rem] lg:shadow-[0_20px_60px_rgba(120,53,15,0.14)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  {t("howItWorksTitle")}
                </p>
                <div className="mt-4 space-y-3">
                  {steps.map((step) => (
                    <div
                      key={step.number}
                      className="flex items-center gap-3 rounded-2xl bg-stone-50 px-3 py-3"
                    >
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-stone-900 shadow-sm">
                        {step.number}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{step.title}</p>
                        <p className="text-xs text-stone-500">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 inline-flex rounded-full border border-amber-200/60 bg-amber-50/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 shadow-[0_10px_30px_rgba(120,53,15,0.12)] lg:absolute lg:bottom-4 lg:right-6 lg:mt-0">
                {t("trustNoAccount")}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-stone-950 md:text-5xl">
                {t("howItWorksTitle")}
              </h2>
              <p className="max-w-2xl text-base leading-7 text-stone-600">
                {t("step1Desc")} {t("step2Desc")} {t("step3Desc")}
              </p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
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

        <section className="px-6 py-16 md:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-stone-200/80 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_58%)] px-6 py-10 shadow-[0_28px_80px_rgba(120,53,15,0.12)] md:px-10 md:py-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-stone-950 md:text-4xl">
                {t("useCasesTitle")}
              </h2>
              <p className="max-w-xl text-sm uppercase tracking-[0.24em] text-stone-400">
                {t("heroSubtitle")}
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {useCases.map((useCase) => (
                <UseCaseCard
                  key={useCase.label}
                  icon={useCase.icon}
                  label={useCase.label}
                  accent={useCase.accent}
                  delay={useCase.delay}
                  description={t("step1Desc")}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2.5rem] bg-stone-950 px-8 py-10 text-white shadow-[0_34px_90px_rgba(28,25,23,0.24)] md:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/80">
                {t("trustTitle")}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                {t("howItWorksTitle")}
              </h2>
              <div className="mt-8 space-y-4">
                {trustItems.map((item, index) => (
                  <div
                    key={item.label}
                    className="animate-rise-in flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4"
                    style={{ animationDelay: `${0.08 + index * 0.08}s` }}
                  >
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-sm text-stone-300">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-amber-200/80 bg-[linear-gradient(180deg,#fffbeb_0%,#fff7ed_50%,#ffffff_100%)] px-8 py-10 shadow-[0_28px_80px_rgba(120,53,15,0.12)] md:px-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
                {t("pricingTitle")}
              </div>
              <p className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-stone-950 md:text-5xl">
                {t("pricingFrom")}
              </p>
              <p className="mt-4 max-w-md text-base leading-7 text-stone-600">
                {t("pricingNotes")}
              </p>
              <div className="mt-8 space-y-4">
                <PricingRow label={tReview("deliveryStandard")} value={t("pricingNotes")} />
                <PricingRow label={tReview("deliveryRegistered")} value={t("step3Desc")} />
                <PricingRow label={tCheckout("securedByStripe")} value={tCheckout("paymentHelp")} />
              </div>
              <Link
                href="/pricing"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-stone-700 transition-colors hover:text-stone-950"
              >
                {t("nav.pricing")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24 pt-12 md:pb-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.75rem] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_28%),linear-gradient(135deg,#1c1917_0%,#292524_55%,#451a03_100%)] px-8 py-12 text-center text-white shadow-[0_36px_100px_rgba(28,25,23,0.26)] md:px-12 md:py-16">
            <div className="mx-auto max-w-3xl">
              <div className="inline-flex animate-rise-in items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
                <Sparkles className="h-4 w-4" />
                {t("trustSecure")}
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
                {t("ctaTitle")}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-stone-200 md:text-lg">
                {t("heroSubtitle")}
              </p>
            </div>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/draft/new"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-stone-950 shadow-[0_18px_50px_rgba(255,255,255,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-50"
              >
                {t("ctaButton")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
              >
                {t("nav.pricing")}
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
      className="animate-rise-in rounded-[2rem] border border-stone-200/80 bg-white/85 p-6 shadow-[0_20px_60px_rgba(120,53,15,0.08)] backdrop-blur"
      style={{ animationDelay: delay } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-amber-50 shadow-inner">
          {icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          {number}
        </span>
      </div>
      <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-stone-950">
        {title}
      </h3>
      <p className="mt-4 text-base leading-7 text-stone-600">{description}</p>
    </article>
  );
}

function UseCaseCard({
  icon,
  label,
  accent,
  delay,
  description,
}: {
  icon: ReactNode;
  label: string;
  accent: string;
  delay: string;
  description: string;
}) {
  return (
    <article
      className={`animate-rise-in group rounded-[2rem] border border-stone-200/80 bg-gradient-to-br ${accent} p-6 shadow-[0_18px_50px_rgba(120,53,15,0.08)] transition-transform duration-300 hover:-translate-y-1`}
      style={{ animationDelay: delay } as CSSProperties}
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-white shadow-sm">
        {icon}
      </div>
      <h3 className="mt-8 text-xl font-semibold tracking-[-0.03em] text-stone-950">
        {label}
      </h3>
      <p className="mt-3 text-sm leading-7 text-stone-600">{description}</p>
    </article>
  );
}

function MetricCard({
  eyebrow,
  value,
}: {
  eyebrow: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-300">
        {eyebrow}
      </p>
      <p className="mt-3 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function PricingRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200/80 bg-white/90 px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-7 text-stone-700">{value}</p>
    </div>
  );
}

function LetterLine({ width }: { width: string }) {
  return <div className="h-3 rounded-full bg-stone-900/8" style={{ width }} />;
}
