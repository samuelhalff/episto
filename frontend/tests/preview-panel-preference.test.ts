import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const workspaceSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx",
  ),
  "utf8",
);
const previewPaneSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx",
  ),
  "utf8",
);

describe("preview panel preference", () => {
  it("reuses a per-draft preference instead of forcing open or closed on every mount", () => {
    expect(workspaceSource).toContain('readPreviewPanelPreference(draftId) ?? true');
    expect(workspaceSource).toContain("writePreviewPanelPreference(draftId, next)");
    expect(workspaceSource).not.toContain("setIsPreviewPanelOpen(true);");
    expect(workspaceSource).not.toContain("setIsPreviewPanelOpen(false);");
    expect(previewPaneSource).toContain("transition-none");
  });
});
