import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const renderServiceSource = readFileSync(
  path.join(repoRoot, "src/modules/rendering/render.service.ts"),
  "utf8",
);

describe("render service split structure", () => {
  it("keeps rendering responsibilities in focused modules", () => {
    expect(existsSync(path.join(repoRoot, "src/modules/rendering/render-template.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "src/modules/rendering/render-pdf.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "src/modules/rendering/render-snapshot-pipeline.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "src/modules/rendering/render.types.ts"))).toBe(true);
    expect(renderServiceSource).toContain('from "./render-template.js"');
    expect(renderServiceSource).toContain('from "./render-pdf.js"');
    expect(renderServiceSource).toContain('from "./render-snapshot-pipeline.js"');
  });
});
