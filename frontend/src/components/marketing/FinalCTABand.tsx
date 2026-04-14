import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { MarketingActionLink, cx } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

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
      {eyebrow ? (
        <MarketingBody
          as="p"
          tone="accentMuted"
          className="text-[11px] font-semibold uppercase tracking-widest"
        >
          {eyebrow}
        </MarketingBody>
      ) : null}
      <MarketingHeading
        as="h2"
        tone="accent"
        className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] md:text-5xl"
      >
        {title}
      </MarketingHeading>
      {body ? (
        <MarketingBody
          as="div"
          tone="accentMuted"
          className="mt-4 max-w-2xl text-sm leading-7 md:text-base"
        >
          {body}
        </MarketingBody>
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
