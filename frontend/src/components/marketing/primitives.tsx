import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { Link } from "../../i18n/navigation";
import {
  getMarketingSectionClassName,
  type MarketingSectionSpacing,
} from "../layout/page-spacing";
import { MarketingIconToken, type MarketingIconTone } from "./MarketingIconToken";
import { MarketingBody, MarketingHeading } from "./typography";

export function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function MarketingSection({
  children,
  className,
  contentClassName,
  muted = false,
  spacing = "default",
  trimTop = false,
  trimBottom = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  muted?: boolean;
  spacing?: MarketingSectionSpacing;
  trimTop?: boolean;
  trimBottom?: boolean;
}) {
  return (
    <section
      className={cx(
        getMarketingSectionClassName({ spacing, trimTop, trimBottom }),
        muted && "bg-[var(--app-surface-muted)]/55 dark:bg-zinc-900/35",
        className,
      )}
    >
      <div className={cx("mx-auto max-w-7xl", contentClassName)}>{children}</div>
    </section>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cx("section-label", className)}>{children}</p>;
}

export function MarketingBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "marketing-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MarketingCard({
  children,
  className,
  tone = "default",
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  tone?: "default" | "muted" | "soft" | "contrast";
}) {
  const toneClassName =
    tone === "contrast"
      ? "marketing-surface-contrast"
      : tone === "soft"
        ? "marketing-surface-soft"
        : tone === "muted"
          ? "marketing-surface-muted"
          : "marketing-surface";

  return (
    <div {...props} className={cx("rounded-3xl p-6 md:p-8", toneClassName, className)}>
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  intro: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto max-w-3xl text-center", className)}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <MarketingHeading
        as="h2"
        className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl md:text-4xl lg:text-5xl"
      >
        {title}
      </MarketingHeading>
      <MarketingBody className="mt-4 text-sm leading-6 sm:text-base sm:leading-7">
        {intro}
      </MarketingBody>
    </div>
  );
}

export function EditorialHeader({
  eyebrow,
  title,
  intro,
  className,
  titleClassName,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cx("max-w-xl", className)}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <MarketingHeading
        as="h2"
        className={cx(
          "mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl md:text-[2.75rem] md:leading-[1.05]",
          titleClassName,
        )}
      >
        {title}
      </MarketingHeading>
      {intro ? (
        <MarketingBody className="mt-4 text-sm leading-6 sm:text-base sm:leading-7">
          {intro}
        </MarketingBody>
      ) : null}
    </div>
  );
}

export function SectionGrid({
  children,
  className,
  columns = 3,
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cx(
        "mt-10 grid gap-4 sm:mt-12 sm:gap-5",
        columns === 3 ? "lg:grid-cols-3 lg:gap-6" : "sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MarketingInfoPill({
  icon,
  tone = "muted",
  children,
  className,
}: {
  icon: ReactNode;
  tone?: MarketingIconTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "marketing-pill flex w-full items-center gap-3.5 rounded-full px-4 py-2.5 text-left text-sm font-medium",
        className,
      )}
    >
      <MarketingIconToken className="h-10 w-10 [&>svg]:size-[17px]" tone={tone}>
        {icon}
      </MarketingIconToken>
      <MarketingBody as="span" tone="strong" className="min-w-0 flex-1 leading-tight">
        {children}
      </MarketingBody>
    </div>
  );
}

export function MarketingFeatureCard({
  icon,
  title,
  body,
  tone = "muted",
  badge,
  className,
  titleClassName,
  style,
  cardTone = "default",
}: {
  icon: ReactNode;
  title: ReactNode;
  body: ReactNode;
  tone?: MarketingIconTone;
  badge?: ReactNode;
  className?: string;
  titleClassName?: string;
  style?: CSSProperties;
  cardTone?: "default" | "muted" | "soft" | "contrast";
}) {
  return (
    <MarketingCard
      className={cx("animate-rise-in p-5 sm:p-6", className)}
      style={style}
      tone={cardTone}
    >
      <div className="flex items-start justify-between gap-4">
        <MarketingIconToken tone={tone} className="h-12 w-12 [&>svg]:size-5">
          {icon}
        </MarketingIconToken>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <MarketingHeading
        as="h3"
        className={cx(
          "mt-5 text-xl font-semibold tracking-[-0.03em] sm:text-2xl",
          titleClassName,
        )}
      >
        {title}
      </MarketingHeading>
      <MarketingBody
        as="div"
        className="mt-4 text-sm leading-6 sm:text-base sm:leading-7"
      >
        {body}
      </MarketingBody>
    </MarketingCard>
  );
}

export function MarketingNotice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("marketing-notice rounded-3xl px-4 py-3 text-sm", className)}>
      {children}
    </div>
  );
}

type MarketingActionLinkProps = Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "className"
> & {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "inverse" | "ghostInverse" | "heroSecondary";
};

export function MarketingActionLink({
  children,
  className,
  variant = "primary",
  ...props
}: MarketingActionLinkProps) {
  const variantClassName =
    variant === "secondary"
      ? "btn-secondary"
      : variant === "ghostInverse"
        ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/15 active:scale-[0.98] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
        : variant === "heroSecondary"
          ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-950 bg-transparent px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-none transition-all duration-200 hover:border-zinc-950 hover:bg-zinc-950/[0.03] active:scale-[0.98] dark:border-amber-100/18 dark:bg-amber-100/10 dark:text-amber-50 dark:hover:border-amber-100/24 dark:hover:bg-amber-100/14"
          : variant === "inverse"
            ? "inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 transition-all duration-200 hover:bg-zinc-100 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            : "btn-primary";

  return (
    <Link
      {...props}
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
        variantClassName,
        className,
      )}
    >
      {children}
    </Link>
  );
}
