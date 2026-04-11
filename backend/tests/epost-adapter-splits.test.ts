import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const adapterSource = readFileSync(
  path.join(repoRoot, "src/modules/dispatch/adapters/epost.adapter.ts"),
  "utf8",
);

describe("epost adapter split structure", () => {
  it("keeps request building, response mapping, and HTTP work in dedicated modules", () => {
    expect(existsSync(path.join(repoRoot, "src/modules/dispatch/adapters/epost-request-builders.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "src/modules/dispatch/adapters/epost-response-mappers.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "src/modules/dispatch/adapters/epost-http-client.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "src/modules/dispatch/adapters/epost-error-mapping.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "src/modules/dispatch/adapters/epost-types.ts"))).toBe(true);
    expect(adapterSource).toContain('from "./epost-http-client.js"');
    expect(adapterSource).toContain('from "./epost-request-builders.js"');
    expect(adapterSource).toContain('from "./epost-response-mappers.js"');
  });
});
