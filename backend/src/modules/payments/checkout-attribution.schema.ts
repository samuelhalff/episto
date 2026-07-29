import { z } from "zod";

/**
 * Validation for the acquisition block the browser attaches to a checkout.
 *
 * Its own module because the rule it encodes is the opposite of every other
 * rule in the checkout route: everything else there guards a payment, and this
 * guards a report. Keeping them apart makes it harder for a later edit to
 * tighten this schema the way the others deserve to be tightened.
 */

/**
 * Bound an attribution value by truncating it, never by rejecting it.
 *
 * `.max()` would be the reflex, and it would be wrong here. Campaign names are
 * whatever an ad platform put in a URL, and a genuinely long `utm_campaign` is
 * a normal thing for a marketing team to create — under `.max()` that customer
 * would get a 400 on the checkout call and simply could not pay. The value
 * exists only to label a channel in a report; losing its tail costs a slightly
 * ugly label, while refusing it costs the sale. The limits match the CHECK
 * constraints in migration 0031, so a truncated value always fits the column.
 */
const bounded = (max: number) =>
  z
    .string()
    .trim()
    .transform((value) => value.slice(0, max))
    .optional();

/**
 * Acquisition parameters the browser collected on the marketing page it landed
 * on. All-optional and never validated for meaning: these are values an
 * advertising network put in a URL, so the only contract we can enforce is a
 * length.
 *
 * The trailing `.catch(undefined)` is the backstop for the same reason: a
 * client that sends `attribution: "google"`, or an array, or any other shape a
 * future frontend bug produces, gets its attribution dropped and its order
 * taken. Analytics is never worth a failed payment.
 */
export const AttributionBody = z
  .object({
    gaClientId: bounded(64),
    gclid: bounded(256),
    utmSource: bounded(128),
    utmMedium: bounded(128),
    utmCampaign: bounded(128),
  })
  .optional()
  .catch(undefined);
