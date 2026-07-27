import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const draftFlow = path.join(__dirname, "../src/components/product/draft-flow");
const read = (file: string) => readFileSync(path.join(draftFlow, file), "utf8");

const intakeStepSource = read("IntakeStep.tsx");
const guidanceSource = read("TemplateGuidance.tsx");
const hookSource = read("use-template-guidance.ts");
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

  // US-3: not having the listed items must never block sending.
  it("introduces no disabled state beyond the turn-off control itself", () => {
    const disabled = guidanceSource.match(/disabled=\{[^}]*\}/g) ?? [];
    expect(disabled).toEqual([
      "disabled={guidance.isTurningOff}",
      "disabled={isTurningOff}",
    ]);
  });

  // US-8: a locale with no landing content falls back to the generic tips
  // rather than showing copy from another locale.
  it("falls back to the generic tips when the locale has no copy", () => {
    expect(guidanceSource).toContain("if (!copy) return <IntakeTips />;");
  });
});

describe("turning template guidance off", () => {
  // US-5b: the PATCH replaces metadata wholesale, so a pending intake autosave
  // landing after the clear would resurrect templateContext.
  it("flushes the pending intake write before clearing", () => {
    const flushIndex = hookSource.indexOf("await flushIntake(intakeText)");
    const clearIndex = hookSource.indexOf("templateContext: null");
    expect(flushIndex).toBeGreaterThan(-1);
    expect(clearIndex).toBeGreaterThan(flushIndex);
  });

  it("merges against the post-flush metadata from the query cache", () => {
    expect(hookSource).toContain("queryClient.getQueryData<DraftLetter>");
    expect(hookSource).toContain("draftOptions(draftId).queryKey");
  });

  // US-5a: the starter is system-authored; anything the user touched is theirs.
  it("clears the composer only when it is byte-identical to the starter", () => {
    expect(hookSource).toContain("isUntouchedDraftStarter(slug, intakeText)");
    expect(hookSource).toContain("clearsStarter ? { intakeInput: null } : {}");
  });

  // US-5b: failure must leave guidance visibly on rather than silently half-off.
  it("surfaces failure instead of clearing locally", () => {
    const clearIndex = hookSource.indexOf('setIntakeText("")');
    const catchIndex = hookSource.indexOf("setHasTurnOffError(true)");
    expect(clearIndex).toBeGreaterThan(-1);
    expect(catchIndex).toBeGreaterThan(clearIndex);
    expect(hookSource).toContain("setIsTurningOff(false)");
  });

  it("says what happened to the composer text", () => {
    expect(guidanceSource).toContain("templateTurnedOffStarterCleared");
    expect(guidanceSource).toContain("templateTurnedOffTextKept");
  });
});

describe("choosing a template with an unfinished draft", () => {
  // US-9 / F5: "Continue draft" used to drop ?template= without a trace.
  it("applies the template to the resumed draft and says so", () => {
    expect(newDraftPageSource).toContain("const resumeDraft = useCallback");
    expect(newDraftPageSource).toContain("templateContext,\n                }),");
    expect(newDraftPageSource).toContain('tr("templateAppliedToResumed")');
  });

  it("does not overwrite the resumed draft's own intake text", () => {
    const resumeStart = newDraftPageSource.indexOf("const resumeDraft = useCallback");
    const resumeEnd = newDraftPageSource.indexOf("const startDraft = useCallback");
    const body = newDraftPageSource.slice(resumeStart, resumeEnd);
    expect(body).not.toContain("intakeInput");
  });
});
