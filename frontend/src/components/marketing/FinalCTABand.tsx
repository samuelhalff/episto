import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "../../i18n/navigation";
import { cx } from "./primitives";
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
        // Closing panel on paper — not a full-bleed billboard, but a deliberate
        // yellow top rule marks the conversion moment so it doesn't disappear.
        "rounded-lg border border-[var(--app-border)] border-t-[3px] border-t-[var(--action-primary-bg)] bg-[var(--app-surface-muted)] px-6 py-10 md:px-10 md:py-12",
        className,
      )}
    >
      {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
      <MarketingHeading
        as="h2"
        className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] md:text-4xl"
      >
        {title}
      </MarketingHeading>
      {body ? (
        <MarketingBody
          as="div"
          tone="muted"
          className="mt-4 max-w-2xl text-sm leading-7 md:text-base"
        >
          {body}
        </MarketingBody>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href={primaryAction.href} className="btn-primary px-5 py-3">
          {primaryAction.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {secondaryAction ? (
          <Link href={secondaryAction.href} className="btn-secondary px-5 py-3">
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
