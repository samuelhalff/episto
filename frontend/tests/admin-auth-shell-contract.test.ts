import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const adminShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/admin/admin-shell.tsx"),
  "utf8",
);
const adminAuthContextSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/admin/admin-auth-context.tsx"),
  "utf8",
);

describe("admin auth shell contract", () => {
  it("removes the legacy credentials path from admin shell", () => {
    expect(adminShellSource).not.toContain("Sign in with credentials");
    expect(adminShellSource).not.toContain('type="password"');
    expect(adminShellSource).not.toContain("makeAuthHeader");
  });

  it("removes the legacy storage path from admin auth context", () => {
    expect(adminAuthContextSource).not.toContain("sessionStorage");
    expect(adminAuthContextSource).not.toContain('"admin_auth"');
  });
});
