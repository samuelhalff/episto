import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const checkoutHookSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-checkout.ts"),
  "utf8",
);
const previewHookSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-letter-preview.ts"),
  "utf8",
);
const companySearchHookSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-recipient-company-search.ts"),
  "utf8",
);
const addressSearchHookPath = path.join(repoRoot, "frontend/src/hooks/use-address-search.ts");
const addressSearchHookSource = existsSync(addressSearchHookPath)
  ? readFileSync(addressSearchHookPath, "utf8")
  : "";

describe("request state boundaries", () => {
  it("distinguishes initial load from background refresh in checkout and preview hooks", () => {
    expect(checkoutHookSource).toContain("isBootstrapping");
    expect(checkoutHookSource).toContain("isRefreshing");
    expect(previewHookSource).toContain("isRefreshing");
  });

  it("keeps company search on a single debounce strategy instead of stacked deferrals", () => {
    expect(companySearchHookSource).toContain("debouncedQuery");
    expect(companySearchHookSource).not.toContain("useDeferredValue");
  });

  it("keeps address search on a single debounce strategy instead of stacked deferrals", () => {
    expect(addressSearchHookSource).toContain("debouncedQuery");
    expect(addressSearchHookSource).not.toContain("useDeferredValue");
  });
});
