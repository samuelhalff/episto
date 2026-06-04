import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const renderTemplateSource = readFileSync(
  path.join(repoRoot, "src/modules/rendering/render-template.ts"),
  "utf8",
);
const backendDockerfileSource = readFileSync(path.join(repoRoot, "Dockerfile"), "utf8");

describe("render layout source", () => {
  it("uses the shared letter layout constants instead of duplicated magic numbers", () => {
    expect(renderTemplateSource).toContain("LETTER_LAYOUT_MM");
    expect(renderTemplateSource).toContain("LETTER_LAYOUT_PT");
    expect(renderTemplateSource).not.toContain("top: 20mm;");
    expect(renderTemplateSource).not.toContain("top: 40mm;");
    expect(renderTemplateSource).not.toContain("top: 52mm;");
    expect(renderTemplateSource).not.toContain("top: 87mm;");
  });

  it("uses the shared color palette instead of hardcoded hex values", () => {
    expect(renderTemplateSource).toContain("LETTER_COLORS");
    expect(renderTemplateSource).toContain("LETTER_COLORS.text");
    expect(renderTemplateSource).toContain("LETTER_COLORS.date");
    expect(renderTemplateSource).toContain("LETTER_COLORS.signatureScript");
    expect(renderTemplateSource).toContain("LETTER_COLORS.signatureName");
    expect(renderTemplateSource).toContain("LETTER_COLORS.enclosure");
    expect(renderTemplateSource).not.toContain("color: #202020;");
    expect(renderTemplateSource).not.toContain("color: #141414;");
    expect(renderTemplateSource).not.toContain("color: #444;");
  });

  it("resolves the signature font from a production-safe backend asset path", () => {
    expect(renderTemplateSource).toContain("resolveSignatureFontUrl");
    expect(renderTemplateSource).toContain("fileURLToPath(import.meta.url)");
    expect(renderTemplateSource).toContain("../../../frontend/public/fonts");
  });

  it("packages signature fonts into the backend runtime image", () => {
    expect(backendDockerfileSource).toContain("frontend/public/fonts");
    expect(backendDockerfileSource).toContain("./frontend/public/fonts");
  });
});
