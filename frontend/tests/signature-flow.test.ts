import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { assertDefined } from "./assert-defined";

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
const signatureImageSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/rendering/signature-image.ts"),
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
const letterContentSource = readFileSync(
  path.join(repoRoot, "frontend/src/lib/letter-content.ts"),
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
const fileRoutesSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/files/file.routes.ts"),
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

  it("SignatureCanvas wraps signature_pad with DPR scaling", () => {
    expect(signatureCanvasSource).toContain('from "signature_pad"');
    expect(signatureCanvasSource).toContain("new SignaturePad(");
    expect(signatureCanvasSource).not.toContain("react-signature-canvas");
    expect(signatureCanvasSource).toContain("devicePixelRatio");
    expect(signatureCanvasSource).toContain("ResizeObserver");
    expect(signatureCanvasSource).toContain("<canvas");
    expect(signatureCanvasSource).toContain("onSignature");
    expect(signatureCanvasSource).not.toContain("@ts-expect-error");
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
    expect(renderServiceSource).toContain("loadSignatureImageBase64");
    expect(signatureImageSource).toContain("downloadObjectBuffer");
    expect(renderServiceSource).toContain("signature-image");
  });

  it("SignatureCanvas debounces stroke-end to avoid duplicate uploads", () => {
    expect(signatureCanvasSource).toContain("STROKE_DEBOUNCE_MS");
    expect(signatureCanvasSource).toContain("debounceRef");
    expect(signatureCanvasSource).toContain("clearTimeout");
    expect(signatureCanvasSource).toContain("setTimeout(exportSignature");
  });

  it("ships a local handwritten font for typed signatures", () => {
    expect(globalsSource).toContain("@font-face");
    expect(globalsSource).toContain('font-family: "Allura Signature"');
    expect(globalsSource).toContain(".signature-script");
  });

  it("uploadFile reads from query cache to avoid stale closure race", () => {
    expect(draftFilesHookSource).toContain("queryClient.getQueryData");
    expect(draftFilesHookSource).toContain("queryKeys.draftFiles(draftId)");
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

  it("WorkspacePreviewPane passes signatureUrl from preview data", () => {
    expect(previewPaneSource).toContain("signatureUrl={getSignatureFileUrl(");
    expect(previewPaneSource).toContain("signatureMode={previewData?.signatureMode}");
  });

  it("signature previews stay on a same-origin preview route", () => {
    expect(letterContentSource).toContain("/preview");
    expect(letterContentSource).not.toContain("/download");
  });
});

describe("signature atomic replacement (v2 simplification)", () => {
  it("backend handles signature replacement atomically in a transaction", () => {
    expect(fileRoutesSource).toContain("db.transaction(async (tx)");
    expect(fileRoutesSource).toContain("signatureMode");
    expect(fileRoutesSource).toContain('status: "deleted"');
    expect(fileRoutesSource).not.toContain("SIGNATURE_LIMIT_REACHED");
  });

  it("backend sets signatureMode to drawn on signature upload", () => {
    expect(fileRoutesSource).toMatch(/signatureMode:\s*"drawn"/);
  });

  it("backend uploads new file to S3 before touching DB", () => {
    const uploadIdx = fileRoutesSource.indexOf("await uploadObject(storageKey");
    const txIdx = fileRoutesSource.indexOf("db.transaction(async (tx)");
    expect(uploadIdx).toBeGreaterThan(-1);
    expect(txIdx).toBeGreaterThan(-1);
    expect(uploadIdx).toBeLessThan(txIdx);
  });

  it("backend cleans up old S3 object after transaction commits", () => {
    const txEndIdx = fileRoutesSource.indexOf("return newRow;");
    const cleanupIdx = fileRoutesSource.indexOf(
      "Failed to delete replaced signature from storage",
    );
    expect(txEndIdx).toBeGreaterThan(-1);
    expect(cleanupIdx).toBeGreaterThan(-1);
    expect(cleanupIdx).toBeGreaterThan(txEndIdx);
  });

  it("frontend handleDrawnSignature is a single upload call (no remove step)", () => {
    expect(logisticsStepSource).toContain("await files.uploadFile(file");
    // No removeFile in the drawn signature handler
    const handler = logisticsStepSource.match(
      /handleDrawnSignature\s*=\s*useCallback\(([\s\S]*?)\n\s*\[/,
    );
    expect(handler).not.toBeNull();
    expect(assertDefined(handler)[1]).not.toContain("removeFile");
  });

  it("frontend validateFile does not reject duplicate signatures", () => {
    expect(draftFilesHookSource).toContain("Signature uniqueness is handled server-side");
    expect(draftFilesHookSource).not.toContain(
      "Only one signature image is allowed per draft",
    );
  });

  it("file mutations do not cascade-invalidate quote queries", () => {
    // Upload uses exact:true for draft query to avoid prefix-matching sub-queries
    expect(draftFilesHookSource).toContain("exact: true");
    // Remove does NOT invalidate the draft query at all
    const removeOnSuccess = draftFilesHookSource.match(
      /removeMutation[\s\S]*?onSuccess:\s*\(\)\s*=>\s*\{([\s\S]*?)\}/,
    );
    expect(removeOnSuccess).not.toBeNull();
    expect(assertDefined(removeOnSuccess)[1]).not.toContain("queryKeys.draft(draftId)");
  });

  it("SignatureSection shows saved signature with redraw option", () => {
    expect(signatureSectionSource).toContain("signatureUrl");
    expect(signatureSectionSource).toContain("isRedrawing");
    expect(signatureSectionSource).toContain("handleRedraw");
    expect(signatureSectionSource).toContain("showSavedSignature");
  });

  it("LogisticsStep passes signatureUrl to SignatureSection", () => {
    expect(logisticsStepSource).toContain("getSignatureFileUrl");
    expect(logisticsStepSource).toContain("signatureUrl={signatureUrl}");
  });
});
