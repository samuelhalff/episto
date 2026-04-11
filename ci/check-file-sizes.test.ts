import { describe, expect, it } from "vitest";

import {
  getFileSizeLimit,
  isTmpPath,
  resolveSizeViolation,
} from "./check-file-sizes.mjs";

describe("check-file-sizes", () => {
  it("uses repo hard limits by file category", () => {
    expect(getFileSizeLimit("frontend/src/app/page.tsx")).toBe(500);
    expect(getFileSizeLimit("backend/tests/example.test.ts")).toBe(700);
    expect(getFileSizeLimit("docs/index.md")).toBe(600);
  });

  it("allows grandfathered files up to their recorded baseline", () => {
    expect(
      resolveSizeViolation("frontend/src/app/[locale]/draft/new/page.tsx", 697, {
        "frontend/src/app/[locale]/draft/new/page.tsx": 697,
      }),
    ).toBeNull();
    expect(
      resolveSizeViolation("frontend/src/app/[locale]/draft/new/page.tsx", 698, {
        "frontend/src/app/[locale]/draft/new/page.tsx": 697,
      }),
    ).toContain("698");
  });

  it("flags new files that exceed the configured limit", () => {
    expect(resolveSizeViolation("frontend/src/lib/new-giant.ts", 501, {})).toContain(
      "exceeds 500 lines",
    );
    expect(resolveSizeViolation("backend/tests/huge.test.ts", 701, {})).toContain(
      "exceeds 700 lines",
    );
  });

  it("blocks tmp-prefixed paths from staged commits", () => {
    expect(isTmpPath("frontend/src/tmp-draft.ts")).toBe(true);
    expect(isTmpPath("frontend/src/not-temp.ts")).toBe(false);
  });
});
