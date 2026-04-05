import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const logisticsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf8",
);
const attachmentUploaderSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/AttachmentUploader.tsx"),
  "utf8",
);
const draftFilesHookSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-draft-files.ts"),
  "utf8",
);

describe("async button feedback", () => {
  it("tracks loading state for delivery and signature controls that write over the network", () => {
    expect(logisticsStepSource).toContain("pendingDeliveryType");
    expect(logisticsStepSource).toContain("pendingSignatureMode");
    expect(logisticsStepSource).toContain("pendingSignatureRemoval");
  });

  it("exposes attachment removal state so destructive file actions can show progress", () => {
    expect(draftFilesHookSource).toContain("removingFileId");
    expect(attachmentUploaderSource).toContain("removingFileId === file.id");
    expect(attachmentUploaderSource).toContain("animate-spin");
  });
});
