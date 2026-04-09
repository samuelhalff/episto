/**
 * Centralized brand identity — single source of truth for the backend.
 *
 * Every consumer of brand strings, display names, and asset references must
 * import from here instead of hardcoding values locally.
 *
 * To rebrand: update the constants below and (on the frontend) the
 * corresponding `frontend/src/lib/brand.ts` module.  All downstream
 * surfaces — PDFs, emails, metadata, API responses — will pick up the
 * change automatically.
 */

/** Public-facing product / brand name. */
export const BRAND_NAME = "Sendly";

/** Primary brand color (golden yellow). */
export const BRAND_COLOR = "#f6c54a";

/** Brand mark SVG rendered inside PDF documents. */
export function renderBrandMarkSvg(size = 56): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 56 56" aria-hidden="true" role="img">
    <rect x="4" y="4" width="48" height="48" rx="18" fill="${BRAND_COLOR}" />
    <circle cx="26" cy="30" r="10.5" fill="none" stroke="#18181b" stroke-width="4" />
    <circle cx="36.5" cy="19.5" r="4.5" fill="#18181b" />
  </svg>`;
}
