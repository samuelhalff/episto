import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Source guards for the "Swiss correspondence" homepage system (2026-07 redesign).
 * The marketing surface intentionally moved away from stacked centered card grids
 * to a left-aligned editorial layout: a realistic letter specimen in the hero, a
 * numbered "route" for the steps, and hairline-ruled ledgers for the remaining
 * sections. These tests pin that intent rather than the previous card visuals.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const marketing = "frontend/src/components/marketing";
const heroSource = read(`${marketing}/HomepageHero.tsx`);
const specimenSource = read(`${marketing}/LetterSpecimen.tsx`);
const howItWorksSource = read(`${marketing}/HowItWorksSteps.tsx`);
const confidenceSource = read(`${marketing}/ConfidenceBlock.tsx`);
const useCasesSource = read(`${marketing}/UseCaseGrid.tsx`);
const trustStripSource = read(`${marketing}/TrustStrip.tsx`);
const globalsCssSource = read("frontend/src/app/globals.css");

describe("marketing homepage visual source coverage (letter system)", () => {
  it("replaces the abstract app mockup with a real letter specimen in the hero", () => {
    expect(heroSource).toContain('import { LetterSpecimen } from "./LetterSpecimen"');
    expect(heroSource).toContain("<LetterSpecimen");
    // The old browser-chrome mockup and its skeleton must be gone.
    expect(heroSource).not.toContain("homepage-hero-mockup-card");
    expect(heroSource).not.toContain("MarketingWindowDots");
    expect(heroSource).not.toContain("paper-noise");
  });

  it("lets the hero be content-led and left-aligned instead of a forced full-height split", () => {
    expect(heroSource).not.toContain("min-h-[calc(100svh-5rem)]");
    // A quiet editorial kicker replaces the sparkles pill badge.
    expect(heroSource).toContain("section-label");
    expect(heroSource).not.toContain("Sparkles");
  });

  it("renders the specimen as a flat real document plus a dispatch docket", () => {
    expect(specimenSource).toContain("SPECIMEN_COPY");
    // A mono dispatch docket replaces the decorative fake-mail styling.
    expect(specimenSource).toContain("docket");
    expect(specimenSource).toContain("font-mono");
    // No fake postmark, no script signature, no tilt.
    expect(specimenSource).not.toContain("signature-script");
    expect(specimenSource).not.toContain("postmark");
    expect(specimenSource).not.toContain("rotate-[");
  });

  it("presents the steps as numbered rows on a black rule (no yellow rail)", () => {
    expect(howItWorksSource).toContain('padStart(2, "0")');
    expect(howItWorksSource).toContain("border-t-2 border-[var(--app-fg)]");
    expect(howItWorksSource).not.toContain("route-rail");
    expect(howItWorksSource).not.toContain("MarketingFeatureSection");
  });

  it("uses hairline-ruled ledgers instead of card grids for the mid-page sections", () => {
    for (const source of [confidenceSource, useCasesSource]) {
      expect(source).toContain("hairline");
      expect(source).toContain("border-t");
      expect(source).not.toContain("MarketingFeatureSection");
    }
    // The confidence section keeps a muted surface so the page rhythm alternates.
    expect(confidenceSource).toContain("muted");
  });

  it("flattens the trust strip into an evidence rail without icon pills", () => {
    expect(trustStripSource).toContain("border-y");
    expect(trustStripSource).toContain("MarketingBody");
    expect(trustStripSource).not.toContain("MarketingIconToken");
    expect(trustStripSource).not.toContain("MarketingInfoPill");
  });

  it("defines the editorial letter-system utilities in globals.css", () => {
    expect(globalsCssSource).toContain(".letter-sheet");
    expect(globalsCssSource).toContain(".route-rail");
    expect(globalsCssSource).toContain(".postmark");
    expect(globalsCssSource).toContain(".numeral");
    expect(globalsCssSource).toContain(".hairline");
  });
});
