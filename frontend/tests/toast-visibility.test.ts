import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const toasterSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/AppToaster.tsx"),
  "utf8",
);

describe("desktop toast visibility", () => {
  it("adds severity-specific desktop colors instead of neutral-only toasts", () => {
    expect(toasterSource).toContain("success:");
    expect(toasterSource).toContain("warning:");
    expect(toasterSource).toContain("error:");
  });
});
