import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingActionLink, MarketingBadge } from "./primitives";

export function HomepageHero() {
  const t = useTranslations("marketing");

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 md:pb-16 md:pt-20 lg:pb-20 lg:pt-28">
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-x-4 top-0 -z-10 h-[72%] rounded-[2.5rem] opacity-30 md:inset-x-8 md:rounded-[3rem]"
      />
      <div
        aria-hidden="true"
        className="animate-glow-pulse pointer-events-none absolute left-1/2 top-16 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-zinc-300/30 blur-3xl dark:bg-amber-500/10 md:top-24 md:h-72 md:w-72"
      />
      <div className="mx-auto max-w-3xl text-center">
        <MarketingBadge className="animate-rise-in text-zinc-600 dark:text-zinc-200">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {t("homepage.hero.badge")}
        </MarketingBadge>
        <h1 className="animate-rise-in mt-4 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:mt-5 sm:text-5xl md:mt-7 md:text-6xl lg:text-7xl">
          {t("homepage.hero.title")}
        </h1>
        <p className="animate-rise-in mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:mt-5 sm:text-base sm:leading-7 md:text-lg md:leading-8 lg:text-xl">
          {t("homepage.hero.subtitle")}
        </p>
        <p className="animate-rise-in mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
          {t("homepage.hero.body")}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
          <MarketingActionLink
            href="/draft/new"
            className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
          >
            {t("homepage.hero.primaryCta")}
            <ArrowRight className="h-4 w-4" />
          </MarketingActionLink>
          <MarketingActionLink
            href="#how-it-works"
            variant="secondary"
            className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
          >
            {t("homepage.hero.secondaryCta")}
          </MarketingActionLink>
        </div>
        <p className="animate-rise-in mx-auto mt-6 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400 sm:mt-8">
          {t("homepage.hero.proof")}
        </p>
      </div>
    </section>
  );
}
