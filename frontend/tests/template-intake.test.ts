import { readFileSync } from "node:fs";
import path from "node:path";
import { DRAFT_TEMPLATE_SLUGS } from "@episto/shared";
import { describe, expect, it } from "vitest";
import { getLandingPage, LANDING_LOCALES } from "../src/lib/landing-content";
import { getTemplateIntake, TEMPLATE_INTAKE } from "../src/lib/template-intake";
import type { TemplateIntake } from "../src/lib/template-intake";

const intakeStepSource = readFileSync(
  path.join(__dirname, "../src/components/product/draft-flow/IntakeStep.tsx"),
  "utf8",
);

/** Words that would turn "have this ready" into a legal assertion. */
const DEADLINE_WORDS = [
  "Frist",
  "fristgerecht",
  "Kündigungsfrist",
  "délai",
  "termine di",
  "entro i termini",
];

/** Fails loudly instead of leaking `undefined` into the assertions below. */
function intakeFor(slug: string, locale: string): TemplateIntake {
  const intake = getTemplateIntake(slug, locale);
  if (!intake) throw new Error(`missing intake copy for ${locale}/${slug}`);
  return intake;
}

describe("template intake registry", () => {
  it("covers every draft template in every landing locale", () => {
    for (const locale of LANDING_LOCALES) {
      for (const slug of DRAFT_TEMPLATE_SLUGS) {
        const intake = intakeFor(slug, locale);
        expect(intake.title.trim().length, `${locale}/${slug} title`).toBeGreaterThan(2);
        expect(intake.prepare.length, `${locale}/${slug} prepare`).toBeGreaterThanOrEqual(
          3,
        );
        expect(intake.prepare.length, `${locale}/${slug} prepare`).toBeLessThanOrEqual(5);
        for (const item of intake.prepare) {
          expect(item.trim().length, `${locale}/${slug} item`).toBeGreaterThan(3);
        }
      }
    }
  });

  it("carries no slugs beyond the draft templates", () => {
    const known = new Set<string>(DRAFT_TEMPLATE_SLUGS);
    for (const locale of LANDING_LOCALES) {
      for (const slug of Object.keys(TEMPLATE_INTAKE[locale])) {
        expect(known.has(slug), `${locale}/${slug}`).toBe(true);
      }
    }
  });

  it("returns null for unknown slugs and for locales without landing content", () => {
    expect(getTemplateIntake("wohnung-kuendigen", "en-CH")).toBeNull();
    expect(getTemplateIntake("einschreiben-online", "de-CH")).toBeNull();
    expect(getTemplateIntake("../de-CH", "de-CH")).toBeNull();
  });

  // Tripwire, not a safeguard: wrong content is rarely byte-identical. The real
  // guard is editorial review — `prepare` is what the USER brings, `checklist`
  // is what the finished letter contains.
  it("does not recycle the landing checklist", () => {
    for (const locale of LANDING_LOCALES) {
      for (const slug of DRAFT_TEMPLATE_SLUGS) {
        const checklist = getLandingPage(locale, slug)?.checklist ?? [];
        const prepare = intakeFor(slug, locale).prepare;
        for (const item of prepare) {
          expect(checklist, `${locale}/${slug}`).not.toContain(item);
        }
      }
    }
  });

  it("never states a notice period or deadline", () => {
    for (const locale of LANDING_LOCALES) {
      for (const slug of DRAFT_TEMPLATE_SLUGS) {
        const intake = intakeFor(slug, locale);
        for (const text of [intake.title, ...intake.prepare]) {
          for (const word of DEADLINE_WORDS) {
            expect(text.toLowerCase(), `${locale}/${slug}`).not.toContain(
              word.toLowerCase(),
            );
          }
        }
      }
    }
  });

  // IntakeStep is a client component; importing the landing barrel there would
  // pull all three SEO datasets into the workspace bundle.
  it("keeps the landing datasets out of the workspace bundle", () => {
    expect(intakeStepSource).not.toMatch(/from\s+"[^"]*landing-content"/);
    expect(intakeStepSource).not.toMatch(/from\s+"[^"]*lib\/landing\//);
  });
});
