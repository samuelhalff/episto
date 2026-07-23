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
    <section className="relative px-4 pb-6 pt-8 sm:px-6 md:pb-8 md:pt-12">
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
            className="mt-4 max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl md:text-5xl"
          >
            {title}
          </MarketingHeading>
          <MarketingBody
            tone="hero"
            className="mt-4 max-w-2xl text-base leading-7 md:text-lg md:leading-8"
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
