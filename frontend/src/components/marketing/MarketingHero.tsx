import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { MarketingActionLink, MarketingBadge } from "./primitives";

interface HeroAction {
  href: string;
  label: string;
}

interface MarketingHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryAction: HeroAction;
  secondaryAction?: HeroAction;
  panel?: ReactNode;
}

export function MarketingHero({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  panel,
}: MarketingHeroProps) {
  const hasPanel = panel !== undefined && panel !== null;

  return (
    <section className="relative overflow-hidden px-6 pb-8 pt-10 md:pb-12 md:pt-14 lg:pb-14 lg:pt-20">
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-x-4 top-0 -z-10 h-[70%] rounded-[2.5rem] opacity-40 md:inset-x-8 md:rounded-[3rem]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-16 -z-10 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-200/35 blur-3xl md:top-24 md:h-72 md:w-72"
      />
      <div
        className={
          hasPanel
            ? "mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12"
            : "mx-auto max-w-7xl"
        }
      >
        <div className="animate-rise-in">
          <MarketingBadge className="text-amber-700 dark:text-amber-300">
            <Sparkles className="h-4 w-4" />
            {eyebrow}
          </MarketingBadge>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 md:text-lg md:leading-8">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <MarketingActionLink
              href={primaryAction.href}
              className="cta-sheen rounded-full text-base"
            >
              {primaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </MarketingActionLink>
            {secondaryAction ? (
              <MarketingActionLink
                href={secondaryAction.href}
                variant="secondary"
                className="rounded-full text-base"
              >
                {secondaryAction.label}
              </MarketingActionLink>
            ) : null}
          </div>
        </div>

        {hasPanel ? (
          <div className="marketing-surface-soft rounded-4xl p-5 md:p-6">{panel}</div>
        ) : null}
      </div>
    </section>
  );
}
