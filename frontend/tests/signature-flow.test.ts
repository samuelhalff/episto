import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const logisticsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf8",
);
const signatureCanvasSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/SignatureCanvas.tsx"),
  "utf8",
);
const signatureSectionSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/SignatureSection.tsx"),
  "utf8",
);
const letterPreviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreview.tsx"),
  "utf8",
);
const renderServiceSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/rendering/render.service.ts"),
  "utf8",
);
const globalsSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);
const sharedSchemas = readFileSync(
  path.join(repoRoot, "shared/src/schemas/index.ts"),
  "utf8",
);
const draftFilesHookSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-draft-files.ts"),
  "utf8",
);
const previewPaneSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx"),
  "utf8",
);

describe("signature canvas redesign", () => {
  it("old SignaturePicker is deleted", () => {
    expect(
      existsSync(path.join(repoRoot, "frontend/src/components/product/SignaturePicker.tsx")),
    ).toBe(false);
  });

  it("shared schemas define typed + drawn modes only", () => {
    expect(sharedSchemas).toContain('"typed"');
    expect(sharedSchemas).toContain('"drawn"');
    expect(sharedSchemas).not.toContain('"image"');
  });

  it("LogisticsStep uses SignatureSection instead of old static card", () => {
    expect(logisticsStepSource).toContain("SignatureSection");
    expect(logisticsStepSource).not.toContain("signatureBootstrapRef");
    expect(logisticsStepSource).not.toContain("signatureImage");
    expect(logisticsStepSource).not.toContain("handleUploadSignature");
    expect(logisticsStepSource).not.toContain("sigInputRef");
  });

  it("SignatureCanvas wraps react-signature-canvas with DPR scaling", () => {
    expect(signatureCanvasSource).toContain("react-signature-canvas");
    expect(signatureCanvasSource).toContain("devicePixelRatio");
    expect(signatureCanvasSource).toContain("ResizeObserver");
    expect(signatureCanvasSource).toContain("onSignature");
  });

  it("SignatureSection offers typed and drawn mode toggle", () => {
    expect(signatureSectionSource).toContain("typed");
    expect(signatureSectionSource).toContain("drawn");
    expect(signatureSectionSource).toContain("SignatureCanvas");
  });

  it("LetterPreview branches rendering between typed and drawn signatures", () => {
    expect(letterPreviewSource).toContain("shouldShowGeneratedSignature");
    expect(letterPreviewSource).toContain("shouldShowDrawnSignature");
    expect(letterPreviewSource).toContain("signatureUrl");
  });

  it("backend PDF renderer supports drawn signature images from S3", () => {
    expect(renderServiceSource).toContain("signatureImageBase64");
    expect(renderServiceSource).toContain("downloadObjectBuffer");
    expect(renderServiceSource).toContain("signature-image");
  });

  it("SignatureCanvas debounces stroke-end to avoid duplicate uploads", () => {
    expect(signatureCanvasSource).toContain("STROKE_DEBOUNCE_MS");
    expect(signatureCanvasSource).toContain("debounceRef");
    expect(signatureCanvasSource).toContain("clearTimeout");
    expect(signatureCanvasSource).toContain("setTimeout(exportSignature");
  });

  it("handleDrawnSignature removes existing signature before re-uploading", () => {
    expect(logisticsStepSource).toContain("files.removeFile");
    expect(logisticsStepSource).toMatch(/if\s*\(files\.signature\)\s*\{[\s\S]*?removeFile/);
    expect(logisticsStepSource).toContain("files.uploadFile(file");
  });

  it("ships a local handwritten font for typed signatures", () => {
    expect(globalsSource).toContain("@font-face");
    expect(globalsSource).toContain('font-family: "Allura Signature"');
    expect(globalsSource).toContain(".signature-script");
  });

  it("uploadFile reads from query cache to avoid stale closure race", () => {
    expect(draftFilesHookSource).toContain("queryClient.getQueryData");
    expect(draftFilesHookSource).toContain("queryKeys.draftFiles(draftId)");
    // Should depend on queryClient+draftId, not closure-captured attachments/signature
    expect(draftFilesHookSource).toMatch(
      /uploadFile\s*=\s*useCallback\([\s\S]*?\[uploadMutation,\s*queryClient,\s*draftId\]/,
    );
  });

  it("removeMutation uses optimistic cache update", () => {
    expect(draftFilesHookSource).toContain("cancelQueries");
    expect(draftFilesHookSource).toContain("setQueryData");
    expect(draftFilesHookSource).toMatch(
      /files\.filter\(\(f\)\s*=>\s*f\.id\s*!==\s*fileId\)/,
    );
  });

  it("file upload/remove invalidates preview and draft queries", () => {
    const previewInvalidations = draftFilesHookSource.match(
      /invalidateQueries.*draftPreview/g,
    );
    const draftInvalidations = draftFilesHookSource.match(
      /invalidateQueries.*queryKeys\.draft\(draftId\)/g,
    );
    // Both onSuccess handlers (upload + remove) should invalidate preview
    expect(previewInvalidations?.length).toBeGreaterThanOrEqual(2);
    expect(draftInvalidations?.length).toBeGreaterThanOrEqual(2);
  });

  it("handleDrawnSignature awaits the upload (not fire-and-forget)", () => {
    expect(logisticsStepSource).toContain("await files.uploadFile(file");
    expect(logisticsStepSource).not.toMatch(/void files\.uploadFile\(/);
  });

  it("WorkspacePreviewPane passes signatureUrl from preview data", () => {
    expect(previewPaneSource).toContain("signatureUrl={getSignatureFileUrl(");
    expect(previewPaneSource).toContain("signatureMode={previewData?.signatureMode}");
  });
});
