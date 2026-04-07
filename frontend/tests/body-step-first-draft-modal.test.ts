import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const bodyStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/BodyStep.tsx"),
  "utf8",
);

describe("body step first draft ready modal", () => {
  it("replaces the old step-entry coachmark with a first-draft-ready dialog", () => {
    expect(bodyStepSource).toContain(
      'const BODY_STEP_FIRST_DRAFT_READY_STORAGE_KEY = "swiss-mail.body-step-first-draft-ready-dismissed.v1";',
    );
    expect(bodyStepSource).toContain('t("firstDraftReadyTitle")');
    expect(bodyStepSource).toContain('t("firstDraftReadyBody")');
    expect(bodyStepSource).toContain('t("firstDraftReadyDismiss")');
    expect(bodyStepSource).toContain("getFirstDraftMessageId(draft.data?.metadata)");
    expect(bodyStepSource).not.toContain("BODY_STEP_COACHMARK_STORAGE_KEY");
    expect(bodyStepSource).not.toContain('t("bodyCoachmarkTitle")');
  });
});
