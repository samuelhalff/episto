/**
 * Centralized brand identity — single source of truth for the frontend.
 *
 * Every consumer of brand strings, display names, and asset references must
 * import from here instead of hardcoding values locally.
 *
 * To rebrand: update the constants below and (on the backend) the
 * corresponding `backend/src/shared/brand.ts` module.  All downstream
 * surfaces — app shell, landing page, metadata, Stripe Elements — will
 * pick up the change automatically.
 */

/** Public-facing product / brand name. */
export const BRAND_NAME = "Sendly";

/** Primary brand color (golden yellow). */
export const BRAND_COLOR = "#f6c54a";

/** Default site domain (used for metadata fallback). */
export const SITE_URL = "https://swissmail.ch";
