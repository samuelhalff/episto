import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../src/app/[locale]/admin");

describe("admin promo mutations", () => {
  it("uses authenticated PATCH and DELETE helpers for edit and delete", () => {
    const api = readFileSync(resolve(root, "promos/promos-api.ts"), "utf8");
    const adminApi = readFileSync(resolve(root, "admin-api.ts"), "utf8");

    expect(api).toContain("adminPatch<AdminPromo>(`/admin/promos/${id}`");
    expect(api).toContain("adminDelete<AdminPromoDeleteResponse>(`/admin/promos/${id}`");
    expect(adminApi).toContain('method: "POST" | "PATCH" | "DELETE"');
    expect(adminApi).toContain('"X-Requested-With": "XMLHttpRequest"');
  });

  it("refetches after success and exposes mutation failures instead of swallowing them", () => {
    const page = readFileSync(resolve(root, "promos/page.tsx"), "utf8");

    expect(page).toContain("await invalidate()");
    expect(page).toContain("Could not delete the code.");
    expect(page).toContain("Could not change the code status.");
    expect(page).toContain('role="alert"');
  });
});
