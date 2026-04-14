import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const primitivesSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/primitives.tsx"),
  "utf8",
);
const globalsCssSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);
const marketingIconTokenPath = path.join(
  repoRoot,
  "frontend/src/components/marketing/MarketingIconToken.tsx",
);
const marketingIconTokenSource = existsSync(marketingIconTokenPath)
  ? readFileSync(marketingIconTokenPath, "utf8")
  : "";
const homepageComponentPaths = {
  hero: path.join(repoRoot, "frontend/src/components/marketing/HomepageHero.tsx"),
  windowDots: path.join(
    repoRoot,
    "frontend/src/components/marketing/MarketingWindowDots.tsx",
  ),
  trustStrip: path.join(repoRoot, "frontend/src/components/marketing/TrustStrip.tsx"),
  howItWorks: path.join(
    repoRoot,
    "frontend/src/components/marketing/HowItWorksSteps.tsx",
  ),
} as const;

describe("marketing homepage visual source coverage", () => {
  it("replaces the hero's blue cast with shared charcoal-and-amber styling", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("homepage-hero-shell");
    expect(heroSource).toContain("homepage-hero-badge");
    expect(heroSource).toContain('variant="heroSecondary"');
    expect(heroSource).not.toContain("backgroundImage:");
    expect(heroSource).not.toContain("#1e3a5f");
    expect(heroSource).not.toContain("#27466f");
    expect(globalsCssSource).toContain(".homepage-hero-shell");
    expect(globalsCssSource).toContain(".homepage-hero-badge");
    expect(globalsCssSource).toContain(".dark .homepage-hero-badge");
    expect(globalsCssSource).not.toContain(".homepage-hero-secondary");
    expect(primitivesSource).toContain('"heroSecondary"');
    expect(primitivesSource).toContain("border-zinc-950");
    expect(primitivesSource).toContain("bg-transparent");
    expect(primitivesSource).toContain("text-zinc-950");
    expect(primitivesSource).toContain("dark:text-amber-50");
    expect(primitivesSource).not.toContain("border-zinc-950/70");
  });

  it("keeps the light-theme hero shell airy instead of a diagonal dark wash", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");
    const heroShellBlock =
      globalsCssSource.match(/\.homepage-hero-shell\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

    expect(heroShellBlock).toContain(".homepage-hero-shell");
    expect(heroShellBlock).toContain(
      "linear-gradient(180deg, #fffdfa 0%, #fdfbf8 54%, #fbf8f2 100%)",
    );
    expect(heroShellBlock).toContain("rgba(250, 204, 21, 0.05)");
    expect(heroShellBlock).toContain("rgba(245, 158, 11, 0.03)");
    expect(heroShellBlock).toContain("rgba(250, 204, 21, 0.01)");
    expect(heroShellBlock).not.toContain(
      "linear-gradient(180deg, #fdfbf8 0%, #faf6ef 58%, #f6efe5 100%)",
    );
    expect(heroShellBlock).not.toContain("rgba(250, 204, 21, 0.08)");
    expect(heroShellBlock).not.toContain("rgba(245, 158, 11, 0.05)");
    expect(heroShellBlock).not.toContain("rgba(250, 204, 21, 0.02)");
    expect(heroSource).toContain("bg-amber-200/16");
    expect(heroSource).toContain("dark:bg-amber-200/30");
    expect(heroSource).not.toContain("rounded-full bg-amber-200/30 blur-3xl");
  });

  it("uses a dark outlined secondary hero CTA in light mode instead of amber chrome", () => {
    expect(primitivesSource).toContain('variant === "heroSecondary"');
    expect(primitivesSource).toContain("border-zinc-950");
    expect(primitivesSource).toContain("text-zinc-950");
    expect(primitivesSource).toContain("hover:border-zinc-950");
    expect(primitivesSource).toContain("dark:border-amber-100/18");
    expect(primitivesSource).not.toContain("border-zinc-950/70");
    expect(primitivesSource).not.toContain("border-amber-300/60");
    expect(primitivesSource).not.toContain("hover:border-amber-300/80");
  });

  it("keeps the light-theme hero chrome flat instead of using heavy badge and button shadows", () => {
    const heroBadgeBlock =
      globalsCssSource.match(/\.homepage-hero-badge\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

    expect(primitivesSource).toContain('variant === "heroSecondary"');
    expect(primitivesSource).toContain("shadow-none");
    expect(primitivesSource).not.toContain("shadow-[0_18px_44px_rgba(0,0,0,0.16)]");
    expect(heroBadgeBlock).toContain("box-shadow: none;");
    expect(heroBadgeBlock).not.toContain("box-shadow: 0 18px 44px rgba(0, 0, 0, 0.16);");
    expect(heroBadgeBlock).not.toContain("backdrop-filter:");
    expect(heroBadgeBlock).not.toContain("-webkit-backdrop-filter:");
  });

  it("keeps the light-theme mockup shadow soft so the hero transition stays clean", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");
    const mockupCardBlock =
      globalsCssSource.match(/\.homepage-hero-mockup-card\s*\{[\s\S]*?\n\s*\}/)?.[0] ??
      "";

    expect(heroSource).toContain("homepage-hero-mockup-card");
    expect(heroSource).not.toContain("shadow-[0_32px_90px_rgba(0,0,0,0.28)]");
    expect(globalsCssSource).toContain(".homepage-hero-mockup-card");
    expect(globalsCssSource).toContain(".dark .homepage-hero-mockup-card");
    expect(mockupCardBlock).toContain("box-shadow: 0 18px 48px rgba(120, 53, 15, 0.08);");
    expect(mockupCardBlock).not.toContain(
      "box-shadow: 0 26px 70px rgba(120, 53, 15, 0.14);",
    );
    expect(globalsCssSource).toContain("box-shadow: 0 32px 90px rgba(0, 0, 0, 0.28);");
  });

  it("keeps the hero step-pill stack compact", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain('className="space-y-3"');
    expect(heroSource).not.toContain('className="space-y-3 py-3 sm:py-4"');
  });

  it("disables the light-theme hero grid so it cannot cast dark bands", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("opacity-0 dark:opacity-40");
  });

  it("keeps hero preview labels in a hero-owned translation namespace", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("homepage.hero.steps");
    expect(heroSource).not.toContain("homepage.howItWorks.steps");
  });

  it("keeps the hero paper mockup skeleton placeholders", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("paper-noise");
    expect(heroSource).toContain("mt-4 h-3 w-28 rounded-full bg-zinc-300/75");
    expect(heroSource).toContain("mt-4 space-y-2");
    expect(heroSource).toContain("w-full rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("w-[88%] rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("w-[82%] rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("w-[75%] rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("w-24 rounded-full bg-zinc-300/70");
    expect(heroSource).toContain("mt-2 h-2.5 w-16 rounded-full bg-zinc-400/70");
  });

  it("avoids thin ruled separators inside the hero paper mockup", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");

    expect(heroSource).toContain("paper-noise");
    expect(heroSource).not.toContain("mt-4 h-px w-full bg-zinc-300/70");
    expect(heroSource).not.toContain("mt-8 h-px w-24 bg-zinc-400/70");
  });

  it("uses a paper texture instead of ruled lines in the hero paper mockup background", () => {
    expect(globalsCssSource).toContain(".paper-noise");
    expect(globalsCssSource).toContain(".dark .paper-noise");
    expect(globalsCssSource).not.toContain("rgba(215, 190, 150, 0.18) 31px");
    expect(globalsCssSource).not.toContain("rgba(110, 118, 129, 0.12) 31px");
  });

  it("avoids vertical gradient banding in the hero paper mockup background", () => {
    const paperNoiseBlock =
      globalsCssSource.match(/\.paper-noise\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
    const darkPaperNoiseBlock =
      globalsCssSource.match(/\.dark \.paper-noise\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

    expect(paperNoiseBlock).toContain("background-image:");
    expect(darkPaperNoiseBlock).toContain("background-image:");
    expect(paperNoiseBlock).not.toContain("linear-gradient(");
    expect(darkPaperNoiseBlock).not.toContain("linear-gradient(");
  });

  it("uses a shared macOS-style red yellow green window dots component in the hero paper mockup", () => {
    const heroSource = readFileSync(homepageComponentPaths.hero, "utf8");
    const windowDotsSource = existsSync(homepageComponentPaths.windowDots)
      ? readFileSync(homepageComponentPaths.windowDots, "utf8")
      : "";

    const redIndex = windowDotsSource.indexOf("#FF5F57");
    const yellowIndex = windowDotsSource.indexOf("#FFBD2E");
    const greenIndex = windowDotsSource.indexOf("#28C840");

    expect(heroSource).toContain(
      'import { MarketingWindowDots } from "./MarketingWindowDots"',
    );
    expect(heroSource).toContain("<MarketingWindowDots />");
    expect(heroSource).not.toContain("bg-emerald-400/80");
    expect(heroSource).not.toContain("bg-amber-400/80");
    expect(heroSource).not.toContain("bg-rose-400/80");
    expect(yellowIndex).toBeGreaterThan(-1);
    expect(redIndex).toBeGreaterThan(-1);
    expect(greenIndex).toBeGreaterThan(-1);
    expect(redIndex).toBeLessThan(yellowIndex);
    expect(yellowIndex).toBeLessThan(greenIndex);
  });

  it("stacks the trust strip as full-width rows on mobile while preserving the desktop wrap", () => {
    const trustStripSource = readFileSync(homepageComponentPaths.trustStrip, "utf8");

    expect(trustStripSource).toContain(
      'section className="mt-10 border-y border-[var(--app-border)] bg-[var(--app-surface-muted)]/75 px-4 py-5 mb-6 sm:mt-12 sm:px-6 sm:mb-8"',
    );
    expect(trustStripSource).not.toContain("py-6 sm:py-7");
    expect(trustStripSource).toContain(
      "flex max-w-7xl flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center",
    );
    expect(trustStripSource).toContain("flex w-full items-center gap-3 rounded-full");
    expect(trustStripSource).toContain("sm:w-auto");
  });

  it("uses the shared amber icon token for subtle trust-strip contrast", () => {
    const trustStripSource = readFileSync(homepageComponentPaths.trustStrip, "utf8");

    expect(trustStripSource).toContain('className="h-9 w-9 [&>svg]:size-4"');
    expect(trustStripSource).toContain('tone="amber"');
    expect(marketingIconTokenSource).toContain(
      "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
    );
    expect(trustStripSource).not.toContain("<MarketingInfoPill");
  });
});
