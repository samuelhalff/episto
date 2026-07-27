import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural invariants only — negative space that a rendering test cannot
 * express ("this string never appears", "no writer uses this shape"). The
 * behaviour of the guidance surfaces is covered for real, by mounting them, in
 * `template-guidance-runtime.test.tsx`.
 */

const draftFlow = path.join(__dirname, "../src/components/product/draft-flow");
const read = (file: string) => readFileSync(path.join(draftFlow, file), "utf8");

const intakeStepSource = read("IntakeStep.tsx");
const guidanceSource = read("TemplateGuidance.tsx");
const newDraftPageSource = readFileSync(
  path.join(__dirname, "../src/app/[locale]/draft/new/page.tsx"),
  "utf8",
);

describe("template guidance surfaces", () => {
  // US-1/US-8: metadata is client-writable, so the only thing taken from it is
  // the slug; every string comes from the trusted static registry.
  it("renders no string that came out of draft metadata", () => {
    expect(intakeStepSource).toContain("templateContext?.slug");
    for (const source of [intakeStepSource, guidanceSource]) {
      expect(source).not.toContain("templateContext.checklist");
      expect(source).not.toContain("templateContext.considerations");
    }
    expect(guidanceSource).toContain("getTemplateIntake(slug, locale)");
  });

  // US-4/US-7: guidance reaches the model on every turn, so the chip has to
  // outlive the empty-composer panel.
  it("keeps the chip visible once the conversation has started", () => {
    expect(intakeStepSource).toMatch(
      /hasConversationActivity \? \(\s*<TemplateGuidanceChip/,
    );
  });
});

describe("draft metadata writes", () => {
  /**
   * The bug class this whole change removes: a client merging a patch into the
   * metadata it rendered from and sending the whole object, which erases every
   * write made since — a finishing AI turn, another tab, its own debounced
   * autosave. The server applies deltas against the row it has locked, so the
   * only correct wire shape is `workspacePatch`.
   */
  it("sends deltas, never a whole merged metadata object", () => {
    const sources = readdirSync(draftFlow)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .map((file) => [file, read(file)] as const)
      .concat([["draft/new/page.tsx", newDraftPageSource]]);

    const offenders = sources
      .filter(([, source]) => /metadata:\s*mergeDraftWorkspaceState/.test(source))
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });
});
