"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { captureAttribution, flushAttribution } from "../../lib/attribution";
import { subscribeConsent } from "../../lib/consent";

/**
 * Records the campaign parameters of whatever URL the visitor is on.
 *
 * Rendered once in the root layout so the capture happens at the landing page,
 * which is several steps before the payment attempt that eventually carries it.
 *
 * `window.location.search` is read directly rather than through
 * `useSearchParams`, which would force every page under this layout out of
 * static rendering — a heavy price for a marketing site to pay for an analytics
 * side effect. `usePathname` re-runs the effect on client navigation without
 * that cost.
 *
 * The consent subscription is what makes the deferred capture work: nothing is
 * persisted before opt-in, so accepting the banner has to be the trigger that
 * writes the click id we have been holding in memory.
 */
export function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureAttribution(window.location.search);
  }, [pathname]);

  useEffect(() => subscribeConsent(flushAttribution), []);

  return null;
}
