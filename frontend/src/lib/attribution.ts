/**
 * Acquisition attribution: capture where the visitor came from, carry it to
 * checkout.
 *
 * The customer arrives on a marketing page and pays several steps later, so the
 * campaign parameters are long gone from the URL by the time a payment attempt
 * exists. Without them a paid order is indistinguishable from an organic one,
 * and CAC per channel — the number the whole paid-acquisition question turns on
 * — cannot be computed at all.
 *
 * Consent is the hard constraint. GA runs in Consent Mode v2 with
 * analytics_storage denied by default, so before opt-in there is no `_ga`
 * cookie and no GA4 client id to read; and writing a Google click id into the
 * visitor's storage is itself the kind of non-essential processing consent
 * exists to authorise. So nothing is written to storage and nothing is sent to
 * the server until analytics consent is granted.
 *
 * That alone would lose the common case — the visitor lands with a `gclid`,
 * reads the banner, and accepts a few seconds later, by which point the URL has
 * been navigated away from. The parameters are therefore held in a module-level
 * variable, which is memory the visitor never persists, and flushed to
 * sessionStorage only if and when consent arrives. Decline, or never decide,
 * and the capture dies with the tab having touched nothing.
 */

import { hasAnalyticsConsent } from "./consent";

const STORAGE_KEY = "episto_attribution";

export interface Attribution {
  gaClientId?: string | undefined;
  gclid?: string | undefined;
  utmSource?: string | undefined;
  utmMedium?: string | undefined;
  utmCampaign?: string | undefined;
}

/**
 * Campaign parameters are bounded before they are stored or sent. A URL is
 * attacker-controlled, and this value ends up in a database column.
 */
const MAX_VALUE_LENGTH = 200;

function clean(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_VALUE_LENGTH);
}

function isEmpty(attribution: Attribution): boolean {
  return Object.values(attribution).every((value) => value === undefined);
}

/**
 * First touch wins. A visitor who arrives from an ad, leaves to read the
 * pricing page and comes back via a bookmark has still been acquired by the ad;
 * letting the later, empty visit overwrite the first would quietly re-assign
 * every multi-visit conversion to "direct".
 */
function mergeFirstTouch(existing: Attribution, incoming: Attribution): Attribution {
  const merged: Attribution = { ...existing };
  for (const [key, value] of Object.entries(incoming) as [
    keyof Attribution,
    string | undefined,
  ][]) {
    if (value !== undefined && merged[key] === undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

/** Held in memory only. Never written anywhere without consent. */
let pending: Attribution = {};

export function parseAttributionFromSearch(search: string): Attribution {
  const params = new URLSearchParams(search);
  const attribution: Attribution = {};
  const gclid = clean(params.get("gclid"));
  const utmSource = clean(params.get("utm_source"));
  const utmMedium = clean(params.get("utm_medium"));
  const utmCampaign = clean(params.get("utm_campaign"));
  if (gclid) attribution.gclid = gclid;
  if (utmSource) attribution.utmSource = utmSource;
  if (utmMedium) attribution.utmMedium = utmMedium;
  if (utmCampaign) attribution.utmCampaign = utmCampaign;
  return attribution;
}

/**
 * Read the GA4 client id out of the `_ga` cookie, which looks like
 * `GA1.1.1234567890.1699999999`. The client id is the last two dot-separated
 * fields, not the whole value — sending the version prefix would produce a
 * client id GA4 has never seen, and the server event would land as a brand-new
 * unattributed user.
 *
 * Returns null whenever the cookie is absent, which is exactly the state before
 * analytics consent is granted.
 */
export function parseGaClientId(cookieString: string): string | null {
  const match = /(?:^|;\s*)_ga=([^;]+)/.exec(cookieString);
  if (!match?.[1]) return null;
  const parts = decodeURIComponent(match[1]).split(".");
  if (parts.length < 4) return null;
  const clientId = parts.slice(-2).join(".");
  return /^\d+\.\d+$/.test(clientId) ? clientId : null;
}

function readStored(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Attribution;
  } catch {
    // Private mode, quota, or a hand-edited value. Attribution is best-effort;
    // losing it must never surface to the customer.
    return {};
  }
}

/**
 * Record the current URL's campaign parameters, and persist them if — and only
 * if — analytics consent has been granted. Safe to call on every navigation.
 */
export function captureAttribution(search: string): void {
  if (typeof window === "undefined") return;
  pending = mergeFirstTouch(pending, parseAttributionFromSearch(search));
  flushAttribution();
}

/**
 * Move whatever is held in memory into sessionStorage once consent allows it.
 * Called again on consent change, which is what rescues the visitor who accepts
 * the banner a few seconds after landing on an ad link.
 */
export function flushAttribution(): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  if (isEmpty(pending)) return;
  const merged = mergeFirstTouch(readStored(), pending);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // See readStored: storage is an optimisation, `pending` still holds the
    // values for the lifetime of this tab.
  }
}

/**
 * The attribution to attach to a checkout, or null when there is none to send.
 *
 * Returns null outright without consent, even if something is sitting in
 * memory: the server persists what it is given, and persisting an ad click id
 * for a visitor who declined analytics would defeat the point of asking.
 */
export function getAttributionForCheckout(): Attribution | null {
  if (typeof window === "undefined") return null;
  if (!hasAnalyticsConsent()) return null;

  const merged = mergeFirstTouch(readStored(), pending);
  const gaClientId = parseGaClientId(document.cookie);
  // No client id is a first-class outcome, not a failure: the visitor may have
  // consented only after GA had already decided not to set a cookie. It is left
  // undefined so the backend records the absence and skips the server-side GA4
  // send rather than inventing an identity.
  if (gaClientId) merged.gaClientId = gaClientId;

  return isEmpty(merged) ? null : merged;
}

/** Test seam — clears the in-memory first-touch capture. */
export function resetAttributionForTests(): void {
  pending = {};
}
