import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRemoteJWKSet, jwtVerify } from "jose";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    ADMIN_MICROSOFT_CLIENT_ID: "swiss-mail-client-id",
    ADMIN_MICROSOFT_CLIENT_SECRET: "swiss-mail-client-secret",
    ADMIN_MICROSOFT_TENANT_ID: "common",
    ADMIN_MICROSOFT_REDIRECT_URI: "http://localhost:4000/api/v1/admin/auth/microsoft/callback",
  }),
}));

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => "mock-jwks"),
  jwtVerify: vi.fn(),
}));

import {
  exchangeMicrosoftCodeForTokens,
  validateMicrosoftIdToken,
} from "../src/modules/admin/admin-microsoft.js";

describe("admin-microsoft helpers", () => {
  beforeEach(() => {
    vi.mocked(createRemoteJWKSet).mockClear();
    vi.mocked(jwtVerify).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges an authorization code for Microsoft tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id_token: "microsoft-id-token",
        access_token: "microsoft-access-token",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeMicrosoftCodeForTokens("code-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: expect.any(URLSearchParams),
      }),
    );

    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("client_id")).toBe("swiss-mail-client-id");
    expect(body.get("client_secret")).toBe("swiss-mail-client-secret");
    expect(body.get("code")).toBe("code-123");
    expect(body.get("redirect_uri")).toBe(
      "http://localhost:4000/api/v1/admin/auth/microsoft/callback",
    );
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(result).toEqual({
      idToken: "microsoft-id-token",
      accessToken: "microsoft-access-token",
    });
  });

  it("validates a Microsoft ID token and normalizes the admin identity", async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        iss: "https://login.microsoftonline.com/tid-456/v2.0",
        aud: "swiss-mail-client-id",
        exp: 4_000_000_000,
        iat: 3_999_999_000,
        oid: "oid-123",
        tid: "tid-456",
        preferred_username: "sam@example.com",
        name: "Sam",
      },
    } as Awaited<ReturnType<typeof jwtVerify>>);

    const result = await validateMicrosoftIdToken("microsoft-id-token");

    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys"),
    );
    expect(jwtVerify).toHaveBeenCalledWith("microsoft-id-token", "mock-jwks", {
      audience: "swiss-mail-client-id",
      algorithms: ["RS256"],
      clockTolerance: 60,
    });
    expect(result).toEqual({
      email: "sam@example.com",
      name: "Sam",
      oid: "oid-123",
      tid: "tid-456",
    });
  });

  it("rejects tokens whose issuer does not match the tenant claim", async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: {
        iss: "https://login.microsoftonline.com/tid-999/v2.0",
        aud: "swiss-mail-client-id",
        exp: 4_000_000_000,
        iat: 3_999_999_000,
        oid: "oid-123",
        tid: "tid-456",
        email: "sam@example.com",
      },
    } as Awaited<ReturnType<typeof jwtVerify>>);

    await expect(validateMicrosoftIdToken("microsoft-id-token")).rejects.toThrow(
      "Tenant ID mismatch between issuer and tid claim",
    );
  });
});
