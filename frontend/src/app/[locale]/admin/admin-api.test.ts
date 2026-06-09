import { afterEach, describe, expect, it, vi } from "vitest";

function ensureFrontendEnv() {
  process.env.NEXT_PUBLIC_SITE_URL ??= "https://example.test";
  process.env.NEXT_PUBLIC_API_URL ??= "/api";
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= "pk_test_example";
  process.env.NEXT_PUBLIC_APP_ENV ??= "test";
}

async function loadAdminApiModule() {
  ensureFrontendEnv();
  vi.resetModules();
  return import("./admin-api");
}

describe("admin-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("does not send Authorization headers for admin fetches", async () => {
    const { adminFetch } = await loadAdminApiModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await adminFetch("/admin/health");

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/admin/health", {
      credentials: "include",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
  });

  it("checks the backend admin session with browser credentials", async () => {
    const { fetchAdminAuthSession } = await loadAdminApiModule();
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

  it("normalizes a bare backend origin to the /api base for admin requests", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    const { fetchAdminAuthSession } = await loadAdminApiModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: false, microsoftSsoEnabled: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAdminAuthSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/admin/auth/session",
      {
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );
  });

  it("keeps browser admin requests on the same-origin /api proxy even with a public API origin", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://episto.ch/api";
    vi.stubGlobal("window", { location: { origin: "https://episto.ch" } });
    const { fetchAdminAuthSession } = await loadAdminApiModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: false, microsoftSsoEnabled: false }),
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
    const { adminLogout } = await loadAdminApiModule();
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

  it("fetches the sent-or-dispatching audience with browser credentials", async () => {
    const { fetchAdminSentAudience } = await loadAdminApiModule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total: 1, rows: [], generatedAt: new Date().toISOString() }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAdminSentAudience();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/admin/audience/sent-or-dispatching", {
      credentials: "include",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
  });
});
