import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const globalsCssSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);
const senderStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SenderStep.tsx"),
  "utf8",
);
const recipientStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientStep.tsx"),
  "utf8",
);
const subjectStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SubjectStep.tsx"),
  "utf8",
);
const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);
const composerSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-composer.tsx"),
  "utf8",
);
const letterPreviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreview.tsx"),
  "utf8",
);

describe("shared form controls", () => {
  it("defines a reusable app-form-control utility", () => {
    expect(globalsCssSource).toContain(".app-form-control");
    expect(globalsCssSource).toContain("font-size: 16px");
    expect(globalsCssSource).toContain("max-width: 100%");
    expect(globalsCssSource).toContain(".app-form-control:-webkit-autofill");
    expect(globalsCssSource).toContain("-webkit-text-fill-color");
  });

  it("applies the reusable form-control utility to draft and preview text entry", () => {
    expect(senderStepSource).toContain("app-form-control");
    expect(recipientStepSource).toContain("app-form-control");
    expect(subjectStepSource).toContain("app-form-control");
    expect(bodyStepSource).toContain("app-form-control");
    expect(composerSource).toContain("app-form-control");
    expect(letterPreviewSource).toContain("app-form-control");
  });
});
