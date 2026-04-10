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

  it("uses the shared letter geometry with absolute paper coordinates", () => {
    expect(letterPreviewSource).toContain("letter-layout-shell");
    expect(letterPreviewSource).toContain("sender-block");
    expect(letterPreviewSource).toContain("dispatch-line");
    expect(letterPreviewSource).toContain("recipient-block");
    expect(letterPreviewSource).toContain("right-meta");
    expect(letterPreviewSource).toContain("body-flow");
    expect(letterPreviewSource).toContain("mmToPageCqw");
    expect(letterPreviewSource).toContain("ptToPageCqw");
    expect(letterPreviewSource).toContain('containerType: "inline-size"');
    expect(letterPreviewSource).toContain('position: "absolute"');
  });

  it("uses the shared color palette for letter content", () => {
    expect(letterPreviewSource).toContain("LETTER_COLORS");
    expect(letterPreviewSource).toContain("LETTER_COLORS.text");
    expect(letterPreviewSource).toContain("LETTER_COLORS.date");
    expect(letterPreviewSource).toContain("LETTER_COLORS.signatureScript");
    expect(letterPreviewSource).toContain("LETTER_COLORS.signatureName");
    expect(letterPreviewSource).toContain("LETTER_COLORS.enclosure");
  });

  it("renders body content with the preview-specific letter sizing", () => {
    expect(letterPreviewSource).toContain('variant="letter"');
  });

  it("renders signatures as a handwritten block with a typed name underneath", () => {
    expect(letterPreviewSource).toContain("signature-script");
    expect(letterPreviewSource).toContain("signature-name");
    expect(letterPreviewSource).not.toContain('{t("signatureLabel")}');
  });
});
