import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const renderServiceSource = readFileSync(
  path.join(repoRoot, "src/modules/rendering/render.service.ts"),
  "utf8",
);

describe("render layout source", () => {
  it("uses the shared letter layout constants instead of duplicated magic numbers", () => {
    expect(renderServiceSource).toContain("LETTER_LAYOUT_MM");
    expect(renderServiceSource).toContain("LETTER_LAYOUT_PT");
    expect(renderServiceSource).not.toContain("top: 20mm;");
    expect(renderServiceSource).not.toContain("top: 40mm;");
    expect(renderServiceSource).not.toContain("top: 52mm;");
    expect(renderServiceSource).not.toContain("top: 87mm;");
  });

  it("uses the shared color palette instead of hardcoded hex values", () => {
    expect(renderServiceSource).toContain("LETTER_COLORS");
    expect(renderServiceSource).toContain("LETTER_COLORS.text");
    expect(renderServiceSource).toContain("LETTER_COLORS.date");
    expect(renderServiceSource).toContain("LETTER_COLORS.signatureScript");
    expect(renderServiceSource).toContain("LETTER_COLORS.signatureName");
    expect(renderServiceSource).toContain("LETTER_COLORS.enclosure");
    expect(renderServiceSource).not.toContain("color: #202020;");
    expect(renderServiceSource).not.toContain("color: #141414;");
    expect(renderServiceSource).not.toContain("color: #444;");
  });
});
