import { describe, expect, it } from "vitest";

import { DRAFT_TEMPLATE_SLUGS, getTemplateGuidance } from "@episto/shared";

import { getLandingPages, LANDING_LOCALES } from "@/lib/landing-content";

/**
 * The assistant's template guidance lives in `shared/src/template-guidance/`,
 * generated from the landing datasets by
 * `node scripts/generate-template-guidance.mjs`.
 *
 * It has to live there — it is server-owned, because guidance that travelled
 * from the client could be paired with a different template's slug. But a second
 * copy of content is a second thing to forget: edit a landing page's checklist
 * and the model would keep being steered by last month's version, with nothing
 * visibly broken. This recomputes the registry and fails if the committed output
 * has drifted.
 *
 * The locales come from the landing registry, not a list retyped here, because
 * the failure mode of a missed locale is silent: it resolves through the
 * en-CH fallback and answers in the wrong language.
 */
describe("template guidance registry", () => {
  it.each(LANDING_LOCALES)("matches the %s landing content", (locale) => {
    for (const page of getLandingPages(locale)) {
      if (!(DRAFT_TEMPLATE_SLUGS as readonly string[]).includes(page.slug)) continue;
      expect(getTemplateGuidance(locale, page.slug), `${locale}/${page.slug}`).toEqual({
        checklist: page.checklist,
        considerations: page.notes.map((note) => `${note.title}: ${note.body}`),
      });
    }
  });

  it("covers every template that can seed a draft, in every authored locale", () => {
    for (const locale of LANDING_LOCALES) {
      for (const slug of DRAFT_TEMPLATE_SLUGS) {
        expect(getTemplateGuidance(locale, slug), `${locale}/${slug}`).not.toBeNull();
      }
    }
  });

  /** The fallback is for en-CH only; anything else missing should be visible. */
  it("returns nothing for a locale it has no content for", () => {
    expect(getTemplateGuidance("es-ES", DRAFT_TEMPLATE_SLUGS[0])).toBeNull();
    expect(getTemplateGuidance("en-CH", DRAFT_TEMPLATE_SLUGS[0])).not.toBeNull();
  });
});
