import { REGISTRY } from "./registry.ts";
import type { TemplateGuidanceEntry } from "./types.ts";

export type { TemplateGuidanceEntry } from "./types.ts";

/**
 * The one locale we serve that has no authored landing content, and the language
 * its drafts inherit from. Deliberately a single named case rather than a
 * catch-all default: a locale that is missing by accident should return nothing
 * and be noticed, not quietly answer in German.
 */
const UNAUTHORED_LOCALE = "en";
const UNAUTHORED_FALLBACK = "de";

/**
 * Guidance for a template, looked up by slug — never taken from the client.
 *
 * `en-CH` falls back to the German copy rather than dropping guidance: a draft
 * seeded in de-CH and then switched to English is still the same letter, and
 * this text frames the model's questions and completeness check. It is never
 * shown to the user and never written into the letter, so the model answering in
 * English from German framing is the intended outcome.
 */
export function getTemplateGuidance(
  locale: string | null | undefined,
  slug: string,
): TemplateGuidanceEntry | null {
  const language = (locale ?? "").slice(0, 2).toLowerCase();
  const table = REGISTRY[language === UNAUTHORED_LOCALE ? UNAUTHORED_FALLBACK : language];
  return table?.[slug] ?? null;
}
