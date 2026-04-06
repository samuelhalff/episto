import { describe, expect, it } from "vitest";
import {
  createAdminOauthStateToken,
  createAdminSessionToken,
  verifyAdminOauthStateToken,
  verifyAdminSessionToken,
} from "../src/modules/admin/admin-auth.js";

const SECRET = "admin-session-secret-at-least-32-characters";

describe("admin auth token helpers", () => {
  it("round-trips a signed admin session token", () => {
    const token = createAdminSessionToken(
      {
        actor: "sam@example.com",
        authMethod: "microsoft",
        email: "sam@example.com",
        name: "Sam",
        oid: "oid-123",
        tid: "tid-456",
      },
      SECRET,
      1_000,
    );

    expect(verifyAdminSessionToken(token, SECRET, 500)).toEqual({
      actor: "sam@example.com",
      authMethod: "microsoft",
      email: "sam@example.com",
      exp: 1_000,
      name: "Sam",
      oid: "oid-123",
      tid: "tid-456",
    });
  });

  it("rejects a tampered admin session token", () => {
    const token = createAdminSessionToken(
      {
        actor: "sam@example.com",
        authMethod: "microsoft",
        email: "sam@example.com",
        oid: "oid-123",
        tid: "tid-456",
      },
      SECRET,
      1_000,
    );

    expect(verifyAdminSessionToken(`${token}tampered`, SECRET, 500)).toBeNull();
  });

  it("rejects expired admin session tokens", () => {
    const token = createAdminSessionToken(
      {
        actor: "sam@example.com",
        authMethod: "microsoft",
        email: "sam@example.com",
        oid: "oid-123",
        tid: "tid-456",
      },
      SECRET,
      1_000,
    );

    expect(verifyAdminSessionToken(token, SECRET, 1_001)).toBeNull();
  });

  it("round-trips a signed Microsoft OAuth state token", () => {
    const token = createAdminOauthStateToken(
      {
        state: "csrf-token",
        returnTo: "/en-CH/overview",
      },
      SECRET,
      1_000,
    );

    expect(verifyAdminOauthStateToken(token, SECRET, 500)).toEqual({
      exp: 1_000,
      returnTo: "/en-CH/overview",
      state: "csrf-token",
    });
  });

  it("rejects expired Microsoft OAuth state tokens", () => {
    const token = createAdminOauthStateToken(
      {
        state: "csrf-token",
        returnTo: "/en-CH/overview",
      },
      SECRET,
      1_000,
    );

    expect(verifyAdminOauthStateToken(token, SECRET, 1_001)).toBeNull();
  });
});
