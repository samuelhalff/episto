import {
  BRAND_COLOR,
  BRAND_MARK_BASE,
  BRAND_MARK_DOT,
  BRAND_MARK_RING,
  BRAND_MARK_VIEW_BOX,
  BRAND_NAME,
} from "@episto/shared";

export { BRAND_COLOR, BRAND_NAME };

/** Brand mark SVG rendered inside PDF documents. */
export function renderBrandMarkSvg(size = 56): string {
  return `<svg width="${size}" height="${size}" viewBox="${BRAND_MARK_VIEW_BOX}" aria-hidden="true" role="img">
    <rect x="${BRAND_MARK_BASE.x}" y="${BRAND_MARK_BASE.y}" width="${BRAND_MARK_BASE.width}" height="${BRAND_MARK_BASE.height}" rx="${BRAND_MARK_BASE.rx}" fill="${BRAND_COLOR}" />
    <circle cx="${BRAND_MARK_RING.cx}" cy="${BRAND_MARK_RING.cy}" r="${BRAND_MARK_RING.r}" fill="none" stroke="${BRAND_MARK_RING.stroke}" stroke-width="${BRAND_MARK_RING.strokeWidth}" />
    <circle cx="${BRAND_MARK_DOT.cx}" cy="${BRAND_MARK_DOT.cy}" r="${BRAND_MARK_DOT.r}" fill="${BRAND_MARK_DOT.fill}" />
  </svg>`;
}

/** Inline email version of the canonical mark; all geometry comes from shared brand constants. */
export function renderEmailBrandMarkSvg(size = 32): string {
  return `<svg width="${size}" height="${size}" viewBox="${BRAND_MARK_VIEW_BOX}" aria-hidden="true" role="presentation" style="display:block;">\n    <rect x="${BRAND_MARK_BASE.x}" y="${BRAND_MARK_BASE.y}" width="${BRAND_MARK_BASE.width}" height="${BRAND_MARK_BASE.height}" rx="${BRAND_MARK_BASE.rx}" fill="${BRAND_COLOR}" />\n    <circle cx="${BRAND_MARK_RING.cx}" cy="${BRAND_MARK_RING.cy}" r="${BRAND_MARK_RING.r}" fill="none" stroke="${BRAND_MARK_RING.stroke}" stroke-width="${BRAND_MARK_RING.strokeWidth}" />\n    <circle cx="${BRAND_MARK_DOT.cx}" cy="${BRAND_MARK_DOT.cy}" r="${BRAND_MARK_DOT.r}" fill="${BRAND_MARK_DOT.fill}" />\n  </svg>`;
}
