import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..");
const source = readFileSync(
  path.join(repoRoot, "src/hooks/use-step-tracking.ts"),
  "utf8",
);

describe("step tracking API URL contract", () => {
  it("passes API-relative paths to apiFetch so the /api proxy is not doubled", () => {
    expect(source).toContain('const path = "/v1/events"');
    expect(source).toContain("apiFetch(path");
    expect(source).not.toContain('"/api/v1/events"');
  });

  it("uses getApiUrl for sendBeacon because beacon does not go through apiFetch", () => {
    expect(source).toContain("navigator.sendBeacon(getApiUrl(path), blob)");
  });
});
