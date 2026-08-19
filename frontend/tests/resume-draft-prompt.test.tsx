import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const componentSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/ResumeDraftPrompt.tsx"),
  "utf8",
);
const layoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/MarketingLayout.tsx"),
  "utf8",
);

describe("returning draft prompt", () => {
  it("uses the session draft list, filters terminal drafts, and is dismissible", () => {
    expect(componentSource).toContain("useDrafts");
    expect(componentSource).toContain('status !== "closed"');
    expect(componentSource).toContain("sessionStorage");
    expect(componentSource).toContain("getCustomerFlowPath");
    expect(componentSource).toContain("updatedAt");
  });

  it("is mounted by the shared marketing layout", () => {
    expect(layoutSource).toContain("ResumeDraftPrompt");
  });
});
