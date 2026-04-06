"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useCallback } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminAuth } from "./admin-auth-context";
import { AdminSidebar } from "./admin-sidebar";
import { makeAuthHeader, adminFetch } from "./admin-api";
import {
  buildAdminMicrosoftLoginUrl,
  getAdminAuthErrorMessage,
} from "./admin-auth-client";

export function AdminShell({ children }: { children: ReactNode }) {
  const { ready, authenticated, microsoftSsoEnabled, login } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const sanitizedReturnTo = useMemo(() => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("authError");
    const nextSearch = nextSearchParams.toString();
    return nextSearch.length > 0 ? `${pathname}?${nextSearch}` : pathname;
  }, [pathname, searchParams]);

  const authErrorMessage = getAdminAuthErrorMessage(searchParams.get("authError"));

  const handleMicrosoftLogin = useCallback(() => {
    setLoading(true);
    setError("");
    // This flow should immediately leave the page, so loading stays active until navigation.
    window.location.assign(
      buildAdminMicrosoftLoginUrl(
        process.env.NEXT_PUBLIC_API_URL ?? "/api",
        sanitizedReturnTo,
      ),
    );
  }, [sanitizedReturnTo]);

  const handleCredentialsLogin = useCallback(async () => {
    const header = makeAuthHeader(username, password);
    setLoading(true);
    setError("");
    try {
      await adminFetch("/admin/health", header);
      login(header);
      router.replace(sanitizedReturnTo);
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }, [username, password, login, router, sanitizedReturnTo]);

  if (!ready) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--app-bg)", color: "var(--app-fg)" }}
      >
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: "var(--app-bg)" }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "var(--app-fg)" }}
            >
              <ShieldCheck className="h-7 w-7" style={{ color: "var(--app-bg)" }} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--app-fg)" }}>
              Admin Access
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--app-muted)" }}>
              Sign in to access the admin dashboard.
            </p>
          </div>

          {microsoftSsoEnabled && !showCredentials && (
            <div className="space-y-4">
              <button
                type="button"
                disabled={loading}
                onClick={handleMicrosoftLogin}
                className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm transition disabled:opacity-40"
                style={{
                  borderColor: "var(--app-border)",
                  color: "var(--app-fg)",
                  background: "var(--app-surface-strong)",
                }}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Sign in with Microsoft"
                )}
              </button>

              {authErrorMessage && (
                <p className="text-center text-sm text-destructive">{authErrorMessage}</p>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: "var(--app-border)" }} />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-3" style={{ background: "var(--app-bg)", color: "var(--app-muted)" }}>or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCredentials(true)}
                className="w-full text-center text-sm transition"
                style={{ color: "var(--app-muted)" }}
              >
                Sign in with credentials
              </button>
            </div>
          )}

          {(showCredentials || !microsoftSsoEnabled) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCredentialsLogin();
              }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--app-surface-muted)",
                  borderColor: "var(--app-border)",
                  color: "var(--app-fg)",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--app-surface-muted)",
                  borderColor: "var(--app-border)",
                  color: "var(--app-fg)",
                }}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              {!error && authErrorMessage && (
                <p className="text-xs text-destructive">{authErrorMessage}</p>
              )}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-40"
                style={{
                  background: "var(--app-fg)",
                  color: "var(--app-bg)",
                }}
              >
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Sign In"}
              </button>

              {microsoftSsoEnabled && (
                <button
                  type="button"
                  onClick={() => setShowCredentials(false)}
                  className="w-full text-center text-sm transition"
                  style={{ color: "var(--app-muted)" }}
                >
                  ← Back to Microsoft SSO
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--app-bg)" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
