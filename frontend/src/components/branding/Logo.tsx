import { BrandMark } from "./BrandMark";

interface LogoProps {
  /** Height/width of the brand icon (Tailwind size classes, e.g. "h-7 w-7"). */
  iconClassName?: string;
  /** Extra classes for the wordmark text. */
  wordmarkClassName?: string;
  /** Extra classes for the outer row wrapper. */
  className?: string;
  /** Render only the brand icon, no wordmark. */
  iconOnly?: boolean;
  /** Marks the icon as non-decorative (adds an aria-label). */
  decorative?: boolean;
}

/**
 * The single source of the Episto logo: brand icon + the lowercase "episto"
 * serif wordmark, baseline-aligned on one row. Use this everywhere the brand
 * appears (marketing, app, admin, status). Never render the wordmark text or
 * BrandMark directly elsewhere.
 */
export function Logo({
  iconClassName = "h-7 w-7",
  wordmarkClassName,
  className,
  iconOnly = false,
  decorative = true,
}: LogoProps) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className ?? ""}`}>
      <BrandMark className={`shrink-0 ${iconClassName}`} decorative={decorative} />
      {!iconOnly && (
        <span
          className={`font-serif font-semibold leading-none tracking-[-0.01em] text-[var(--app-fg)] ${
            wordmarkClassName ?? ""
          }`}
        >
          episto
        </span>
      )}
    </span>
  );
}
