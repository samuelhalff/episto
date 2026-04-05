import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "../../i18n/navigation";

export function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function MarketingSection({
  children,
  className,
  contentClassName,
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  muted?: boolean;
}) {
  return (
    <section
      className={cx(
        "px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:py-28",
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
    <div {...props} className={cx("rounded-[2rem] p-6 md:p-8", toneClassName, className)}>
      {children}
    </div>
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
  variant?: "primary" | "secondary" | "inverse" | "ghostInverse";
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
