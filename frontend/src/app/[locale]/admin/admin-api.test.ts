import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_SESSION_AUTH,
  adminFetch,
  adminLogout,
  fetchAdminAuthSession,
} from "./admin-api";

describe("admin-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends basic auth headers and browser credentials for admin fetches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await adminFetch("/admin/health", "Basic abc123");

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/admin/health", {
      credentials: "include",
      headers: {
        Authorization: "Basic abc123",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
  });

  it("omits Authorization when using the cookie-backed session sentinel", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await adminFetch("/admin/health", ADMIN_SESSION_AUTH);

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/admin/health", {
      credentials: "include",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
  });

  it("checks the backend admin session with browser credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAdminAuthSession();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/admin/auth/session", {
      credentials: "include",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
  });

  it("posts to the backend logout endpoint with browser credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await adminLogout();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/admin/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
  });
});
