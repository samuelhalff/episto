import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";
import { requireAdmin } from "../src/shared/middleware/require-admin.js";

// Mock env() to return known credentials
vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "secret-password-123",
  }),
}));

function makeRequest(authHeader?: string): FastifyRequest {
  return {
    headers: {
      ...(authHeader !== undefined ? { authorization: authHeader } : {}),
    },
    log: { info: vi.fn() },
  } as unknown as FastifyRequest;
}

const mockReply = {} as FastifyReply;

describe("requireAdmin middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts valid Basic Auth credentials", async () => {
    const encoded = Buffer.from("admin:secret-password-123").toString("base64");
    const req = makeRequest(`Basic ${encoded}`);

    await expect(requireAdmin(req, mockReply)).resolves.toBeUndefined();
    expect(req.log.info).toHaveBeenCalledWith(
      { admin: "admin" },
      "Admin access",
    );
  });

  it("rejects missing Authorization header (401)", async () => {
    const req = makeRequest(undefined);

    await expect(requireAdmin(req, mockReply)).rejects.toMatchObject({
      statusCode: 401,
      code: "ADMIN_AUTH_REQUIRED",
    });
  });

  it("rejects non-Basic auth scheme (401)", async () => {
    const req = makeRequest("Bearer some-token");

    await expect(requireAdmin(req, mockReply)).rejects.toMatchObject({
      statusCode: 401,
      code: "ADMIN_AUTH_REQUIRED",
    });
  });

  it("rejects malformed Base64 without colon (401)", async () => {
    const encoded = Buffer.from("nocolon").toString("base64");
    const req = makeRequest(`Basic ${encoded}`);

    await expect(requireAdmin(req, mockReply)).rejects.toMatchObject({
      statusCode: 401,
      code: "ADMIN_AUTH_REQUIRED",
    });
  });

  it("rejects wrong username (403)", async () => {
    const encoded = Buffer.from("wrong-user:secret-password-123").toString(
      "base64",
    );
    const req = makeRequest(`Basic ${encoded}`);

    await expect(requireAdmin(req, mockReply)).rejects.toMatchObject({
      statusCode: 403,
      code: "ADMIN_FORBIDDEN",
    });
  });

  it("rejects wrong password (403)", async () => {
    const encoded = Buffer.from("admin:wrong-password").toString("base64");
    const req = makeRequest(`Basic ${encoded}`);

    await expect(requireAdmin(req, mockReply)).rejects.toMatchObject({
      statusCode: 403,
      code: "ADMIN_FORBIDDEN",
    });
  });

  it("rejects completely wrong credentials (403)", async () => {
    const encoded = Buffer.from("hacker:12345").toString("base64");
    const req = makeRequest(`Basic ${encoded}`);

    await expect(requireAdmin(req, mockReply)).rejects.toMatchObject({
      statusCode: 403,
      code: "ADMIN_FORBIDDEN",
    });
  });

  it("rejects empty Authorization value (401)", async () => {
    const req = makeRequest("");

    await expect(requireAdmin(req, mockReply)).rejects.toMatchObject({
      statusCode: 401,
      code: "ADMIN_AUTH_REQUIRED",
    });
  });
});
