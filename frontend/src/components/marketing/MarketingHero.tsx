import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { MarketingActionLink } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

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
    <section className="relative px-4 pb-8 pt-10 sm:px-6 md:pb-12 md:pt-14 lg:pb-16 lg:pt-20">
      <div
        className={
          hasPanel
            ? "mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
            : "mx-auto max-w-7xl"
        }
      >
        <div>
          <p className="section-label">{eyebrow}</p>
          <MarketingHeading
            as="h1"
            tone="hero"
            className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl md:text-6xl"
          >
            {title}
          </MarketingHeading>
          <MarketingBody
            tone="hero"
            className="mt-5 max-w-2xl text-base leading-7 md:text-lg md:leading-8"
          >
            {subtitle}
          </MarketingBody>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <MarketingActionLink
              href={primaryAction.href}
              className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
            >
              {primaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </MarketingActionLink>
            {secondaryAction ? (
              <MarketingActionLink
                href={secondaryAction.href}
                variant="heroSecondary"
                className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
              >
                {secondaryAction.label}
              </MarketingActionLink>
            ) : null}
          </div>
        </div>

        {hasPanel ? (
          <div className="letter-sheet rounded-[1.5rem] p-6 md:p-8">{panel}</div>
        ) : null}
      </div>
    </section>
  );
}
