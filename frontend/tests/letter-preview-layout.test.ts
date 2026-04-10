import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const letterPreviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreview.tsx"),
  "utf8",
);

describe("letter preview layout", () => {
  it("keeps the paper surface on an A4 aspect ratio before content overflow expands it", () => {
    expect(letterPreviewSource).toContain("aspect-[210/297]");
  });

  it("uses a flow-based grid layout with semantic class names", () => {
    expect(letterPreviewSource).toContain("letter-layout-shell");
    expect(letterPreviewSource).toContain("letter-header");
    expect(letterPreviewSource).toContain("sender-block");
    expect(letterPreviewSource).toContain("dispatch-line");
    expect(letterPreviewSource).toContain("recipient-block");
    expect(letterPreviewSource).toContain("right-meta");
    expect(letterPreviewSource).toContain("body-flow");
    expect(letterPreviewSource).toContain("gridTemplateColumns");
    expect(letterPreviewSource).not.toContain("position: absolute");
    expect(letterPreviewSource).not.toContain('"absolute"');
  });

  it("uses mmPct helper for all spacing instead of absolute positioning", () => {
    expect(letterPreviewSource).toContain("function mmPct(");
    expect(letterPreviewSource).toContain("mmPct(");
    expect(letterPreviewSource).not.toContain("mmToPreviewHeight");
  });

  it("renders signatures as a handwritten block with a typed name underneath", () => {
    expect(letterPreviewSource).toContain("signature-script");
    expect(letterPreviewSource).toContain("signature-name");
    expect(letterPreviewSource).not.toContain('{t("signatureLabel")}');
  });
});
