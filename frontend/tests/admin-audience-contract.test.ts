import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const adminApiSource = readSource("frontend/src/app/[locale]/admin/admin-api.ts");
const sidebarSource = readSource("frontend/src/app/[locale]/admin/admin-sidebar.tsx");
const queryKeysSource = readSource("shared/src/query-keys.ts");
const contractsSource = readSource("shared/src/contracts/index.ts");
const audiencePagePath = path.join(
  repoRoot,
  "frontend/src/app/[locale]/admin/audience/page.tsx",
);
const audiencePageSource = existsSync(audiencePagePath)
  ? readFileSync(audiencePagePath, "utf8")
  : "";

describe("admin audience contract", () => {
  it("adds typed contracts for sent-or-dispatching audiences", () => {
    expect(contractsSource).toContain("export type AdminAudienceKind");
    expect(contractsSource).toContain("sent_or_dispatching");
    expect(contractsSource).toContain("export interface AdminSentAudienceResponse");
  });

  it("adds query keys and fetch helpers for the audience surfaces", () => {
    expect(queryKeysSource).toContain("audience: (kind: string)");
    expect(adminApiSource).toContain("fetchAdminSentAudience");
    expect(adminApiSource).toContain("downloadAdminAudienceExport");
  });

  it("adds an audience page to the admin UI and navigation", () => {
    expect(existsSync(audiencePagePath)).toBe(true);
    expect(sidebarSource).toContain('href: "audience"');
    expect(audiencePageSource).toContain("downloadAdminAudienceExport");
    expect(audiencePageSource).toContain("Sent / dispatching");
    expect(audiencePageSource).toContain("furthestStatus");
  });
});
