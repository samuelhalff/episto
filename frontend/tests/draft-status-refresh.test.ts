import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const useDraftSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-draft.ts"),
  "utf8",
);

describe("draft status refresh", () => {
  it("stops polling once a draft is frozen and ready_to_sign", () => {
    expect(useDraftSource).toContain("const TRANSITIONAL_DRAFT_STATUSES = new Set([");
    expect(useDraftSource).not.toContain('"ready_to_sign"');
    expect(useDraftSource).toContain("refetchInterval: (query) =>");
    expect(useDraftSource).toContain(
      "TRANSITIONAL_DRAFT_STATUSES.has(draft.status) ? 1_000 : false",
    );
  });

  it("invalidates the draft query when realtime status events arrive", () => {
    expect(useDraftSource).toContain('event.type === "draft_status"');
    expect(useDraftSource).toContain(
      'event.type === "error" && event.data.code === "SSE_FALLBACK"',
    );
    expect(useDraftSource).toContain("invalidateQueries");
  });
});
