import {
  BRAND_COLOR,
  BRAND_MARK_BASE,
  BRAND_MARK_DOT,
  BRAND_MARK_RING,
  BRAND_MARK_VIEW_BOX,
  BRAND_NAME,
} from "@swiss-mail/shared";

interface BrandMarkProps {
  className?: string;
  decorative?: boolean;
}

export function BrandMark({ className, decorative = true }: BrandMarkProps) {
  return (
    <svg
      viewBox={BRAND_MARK_VIEW_BOX}
      className={className}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative}
      aria-label={decorative ? undefined : BRAND_NAME}
      focusable="false"
    >
      <rect
        x={BRAND_MARK_BASE.x}
        y={BRAND_MARK_BASE.y}
        width={BRAND_MARK_BASE.width}
        height={BRAND_MARK_BASE.height}
        rx={BRAND_MARK_BASE.rx}
        fill={BRAND_COLOR}
      />
      <circle
        cx={BRAND_MARK_RING.cx}
        cy={BRAND_MARK_RING.cy}
        r={BRAND_MARK_RING.r}
        fill="none"
        stroke={BRAND_MARK_RING.stroke}
        strokeWidth={BRAND_MARK_RING.strokeWidth}
      />
      <circle
        cx={BRAND_MARK_DOT.cx}
        cy={BRAND_MARK_DOT.cy}
        r={BRAND_MARK_DOT.r}
        fill={BRAND_MARK_DOT.fill}
      />
    </svg>
  );
}
