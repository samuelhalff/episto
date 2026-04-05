import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { MarketingActionLink, SectionLabel, cx } from "./primitives";

interface ActionLink {
  href: string;
  label: string;
}

export function FinalCTABand({
  eyebrow,
  title,
  body,
  primaryAction,
  secondaryAction,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: ReactNode;
  primaryAction: ActionLink;
  secondaryAction?: ActionLink;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "marketing-cta-band rounded-[2.5rem] px-6 py-10 md:px-10 md:py-14",
        className,
      )}
    >
      {eyebrow ? <SectionLabel className="text-white/70">{eyebrow}</SectionLabel> : null}
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
        {title}
      </h2>
      {body ? (
        <div className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
          {body}
        </div>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <MarketingActionLink href={primaryAction.href} variant="inverse">
          {primaryAction.label}
          <ArrowRight className="h-4 w-4" />
        </MarketingActionLink>
        {secondaryAction ? (
          <MarketingActionLink href={secondaryAction.href} variant="ghostInverse">
            {secondaryAction.label}
          </MarketingActionLink>
        ) : null}
      </div>
    </div>
  );
}
