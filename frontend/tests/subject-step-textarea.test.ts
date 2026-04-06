import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const subjectStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SubjectStep.tsx"),
  "utf8",
);

describe("subject step textarea", () => {
  it("uses an autosizing textarea while keeping normalized subject persistence", () => {
    expect(subjectStepSource).toContain("const textareaRef = useRef<HTMLTextAreaElement>(null);");
    expect(subjectStepSource).toContain("<textarea");
    expect(subjectStepSource).toContain('textarea.style.height = "0px";');
    expect(subjectStepSource).toContain("normalizeLetterSubject(subject,");
    expect(subjectStepSource).toContain('e.target.value.replace(/[\\r\\n]+/g, " ")');
    expect(subjectStepSource).not.toContain("<input");
    expect(subjectStepSource).not.toContain("rows={");
  });
});
