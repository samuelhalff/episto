/**
 * Client-safe intake registry for the draft workspace.
 *
 * Deliberately separate from `landing-content.ts`: `IntakeStep` is a client
 * component, and importing the landing barrel there would pull all three SEO
 * datasets (de.ts alone is >1200 lines) into the workspace bundle. This module
 * carries only what the workspace renders — a short title and the preparation
 * list — for the 16 draft-template slugs.
 */
import type { LandingLocale } from "../landing-routes";
import { DE_TEMPLATE_INTAKE } from "./de";
import { FR_TEMPLATE_INTAKE } from "./fr";
import { IT_TEMPLATE_INTAKE } from "./it";
import type { TemplateIntake } from "./types";

export type { TemplateIntake } from "./types";

export const TEMPLATE_INTAKE: Record<LandingLocale, Record<string, TemplateIntake>> = {
  "de-CH": DE_TEMPLATE_INTAKE,
  "fr-CH": FR_TEMPLATE_INTAKE,
  "it-CH": IT_TEMPLATE_INTAKE,
};

/**
 * Returns the intake copy for a template, or null when the slug is unknown or
 * the active locale has no landing content (en-CH). Callers must render nothing
 * on null rather than falling back to another locale.
 */
export function getTemplateIntake(slug: string, locale: string): TemplateIntake | null {
  const byLocale = TEMPLATE_INTAKE[locale as LandingLocale];
  return byLocale?.[slug] ?? null;
}
