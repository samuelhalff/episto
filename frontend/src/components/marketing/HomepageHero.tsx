import { ArrowRight, FileText, MessageCircle, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingWindowDots } from "./MarketingWindowDots";
import { MarketingActionLink, MarketingBadge } from "./primitives";
import { MarketingBody, MarketingHeading, MarketingMeta } from "./typography";

const heroSteps = [
  { key: "describe", Icon: MessageCircle },
  { key: "review", Icon: FileText },
  { key: "send", Icon: Send },
] as const;

export function HomepageHero() {
  const t = useTranslations("marketing");

  return (
    <section className="homepage-hero-shell relative overflow-hidden">
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-x-4 top-0 -z-10 h-[76%] rounded-[2.5rem] opacity-0 dark:opacity-40 md:inset-x-8 md:rounded-[3rem]"
      />
      <div
        aria-hidden="true"
        className="animate-glow-pulse pointer-events-none absolute left-1/2 top-12 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-200/16 blur-3xl dark:bg-amber-200/30 md:top-16 md:h-72 md:w-72"
      />
      <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:pb-20 lg:pt-20">
        <div className="relative z-10 max-w-xl">
          <MarketingBadge className="homepage-hero-badge animate-rise-in">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("homepage.hero.badge")}
          </MarketingBadge>
          <MarketingHeading
            as="h1"
            tone="hero"
            className="animate-rise-in mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {t("homepage.hero.title")}
          </MarketingHeading>
          <MarketingBody
            tone="hero"
            className="animate-rise-in mt-5 max-w-xl text-base leading-7 md:text-lg md:leading-8"
          >
            {t("homepage.hero.subtitle")}
          </MarketingBody>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <MarketingActionLink
              href="/draft/new"
              className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
            >
              {t("homepage.hero.primaryCta")}
              <ArrowRight className="h-4 w-4" />
            </MarketingActionLink>
            <MarketingActionLink
              href="#how-it-works"
              variant="heroSecondary"
              className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
            >
              {t("homepage.hero.secondaryCta")}
            </MarketingActionLink>
          </div>
          <MarketingMeta
            tone="hero"
            className="animate-rise-in mt-6 max-w-xl text-sm leading-6"
          >
            {t("homepage.hero.proof")}
          </MarketingMeta>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto w-full max-w-[34rem] lg:justify-self-end"
        >
          <div className="absolute inset-x-8 bottom-0 top-10 rounded-[2.25rem] bg-amber-300/10 blur-3xl" />
          <div className="homepage-hero-mockup-card marketing-surface-contrast animate-rise-in relative overflow-hidden rounded-[2rem] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-3">
                {heroSteps.map(({ key, Icon }) => (
                  <div
                    key={key}
                    className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <Icon className="h-4 w-4" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {t(`homepage.hero.steps.${key}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="paper-noise rounded-[1.5rem] border border-amber-100/60 p-4 shadow-inner shadow-amber-200/35">
                <MarketingWindowDots />
                <div className="mt-4 h-3 w-28 rounded-full bg-zinc-300/75" />
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-zinc-300/70" />
                  <div className="h-2.5 w-[88%] rounded-full bg-zinc-300/70" />
                  <div className="h-2.5 w-[82%] rounded-full bg-zinc-300/70" />
                  <div className="h-2.5 w-[75%] rounded-full bg-zinc-300/70" />
                </div>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="h-2.5 w-24 rounded-full bg-zinc-300/70" />
                  <div className="h-7 w-20 rounded-full bg-amber-300/70" />
                </div>
                <div className="mt-2 h-2.5 w-16 rounded-full bg-zinc-400/70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
