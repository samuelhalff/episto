import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "../../i18n/navigation.js";

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
    <section className="relative overflow-hidden px-6 pb-16 pt-16 md:pb-20 md:pt-20 lg:pb-24 lg:pt-24">
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-x-4 top-0 -z-10 h-[88%] rounded-[2.5rem] opacity-40 md:inset-x-8 md:rounded-[3rem]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-16 -z-10 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-200/35 blur-3xl md:top-24 md:h-72 md:w-72"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="animate-rise-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 shadow-[0_14px_35px_rgba(120,53,15,0.08)]">
            <Sparkles className="h-4 w-4" />
            {eyebrow}
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-stone-950 sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 md:text-lg md:leading-8">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={primaryAction.href}
              className="cta-sheen inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3.5 text-base font-semibold text-white shadow-[0_20px_50px_rgba(28,25,23,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-stone-800"
            >
              {primaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-300/70 bg-white/85 px-6 py-3.5 text-base font-medium text-stone-700 shadow-[0_12px_30px_rgba(120,53,15,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:text-stone-950"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="paper-noise rounded-[2rem] border border-white/80 p-5 shadow-[0_28px_70px_rgba(120,53,15,0.16)] md:p-6">
          {panel}
        </div>
      </div>
    </section>
  );
}
