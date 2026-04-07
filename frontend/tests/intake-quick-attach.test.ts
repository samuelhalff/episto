import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const intakeStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/IntakeStep.tsx"),
  "utf8",
);

describe("intake quick attach regressions", () => {
  it("allows selecting multiple files from the hidden intake input", () => {
    expect(intakeStepSource).toContain('type="file"');
    expect(intakeStepSource).toContain("multiple");
    expect(intakeStepSource).toContain("Array.from(event.target.files ?? [])");
    expect(intakeStepSource).toContain('await files.uploadFile(file, "attachment")');
  });
});
