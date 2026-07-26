import { describe, expect, it } from "vitest";
import { isAllowedAdmin, csvSet } from "../src/modules/admin/admin-authorization.js";

const cfg = (oids: string, emails: string) => ({
  ADMIN_MICROSOFT_ALLOWED_OIDS: oids,
  ADMIN_MICROSOFT_ALLOWED_EMAILS: emails,
});

describe("admin authorization allowlist", () => {
  it("matches by OID (case-insensitive, trimmed)", () => {
    const c = cfg("ABC-123, def-456", "");
    expect(isAllowedAdmin({ oid: "abc-123" }, c)).toBe(true);
    expect(isAllowedAdmin({ oid: "  DEF-456 " }, c)).toBe(true);
    expect(isAllowedAdmin({ oid: "zzz" }, c)).toBe(false);
  });

  it("matches by email fallback (case-insensitive)", () => {
    const c = cfg("", "Founder@Episto.CH");
    expect(isAllowedAdmin({ email: "founder@episto.ch" }, c)).toBe(true);
    expect(isAllowedAdmin({ email: "other@episto.ch" }, c)).toBe(false);
  });

  it("denies when neither matches or allowlists are empty", () => {
    expect(isAllowedAdmin({ oid: "x", email: "y@z.ch" }, cfg("", ""))).toBe(false);
    expect(isAllowedAdmin({}, cfg("a", "b@c.ch"))).toBe(false);
  });

  it("csvSet ignores blanks and whitespace-only entries", () => {
    expect([...csvSet("a, ,b ,, c")]).toEqual(["a", "b", "c"]);
    expect(csvSet("").size).toBe(0);
  });
});
