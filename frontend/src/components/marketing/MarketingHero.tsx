import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "../../i18n/navigation";

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
  panel: ReactNode;
}

export function MarketingHero({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  panel,
}: MarketingHeroProps) {
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
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="animate-rise-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-700 shadow-elevated dark:border-amber-500/30 dark:bg-zinc-900/85 dark:text-amber-300">
            <Sparkles className="h-4 w-4" />
            {eyebrow}
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 md:text-lg md:leading-8">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={primaryAction.href}
              className="cta-sheen inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 py-3.5 text-base font-semibold text-white shadow-prominent transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {primaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-300/70 bg-white/85 px-6 py-3.5 text-base font-medium text-zinc-700 shadow-elevated transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-200 dark:hover:border-amber-400/60 dark:hover:text-white"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="paper-noise rounded-4xl border border-white/80 p-5 shadow-prominent-warm md:p-6">
          {panel}
        </div>
      </div>
    </section>
  );
}
