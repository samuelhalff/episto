"use client";

import type { ReactNode } from "react";
import { useState, useCallback, useEffect } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "./admin-auth-context";
import { AdminSidebar } from "./admin-sidebar";
import { makeAuthHeader, adminFetch } from "./admin-api";
import { getMsalInstance, loginRequest, isMsalConfigured } from "../../../lib/msal-config";

export function AdminShell({ children }: { children: ReactNode }) {
  const { authenticated, login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [msalReady, setMsalReady] = useState(false);
  const [msalError, setMsalError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"sso" | "credentials">(
    isMsalConfigured ? "sso" : "credentials",
  );

  useEffect(() => {
    if (!isMsalConfigured) return;
    const msalInstance = getMsalInstance();
    if (!msalInstance) return;
    void msalInstance.initialize().then(() => {
      setMsalReady(true);
    }).catch((err: unknown) => {
      setMsalReady(false);
      setMsalError(err instanceof Error ? err.message : "SSO initialization failed");
    });
  }, []);

  const handleMsalLogin = useCallback(async () => {
    const msalInstance = getMsalInstance();
    if (!msalInstance) return;
    setLoading(true);
    setMsalError(null);
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      const token = response.accessToken;
      const header = `Bearer ${token}`;
      await adminFetch("/admin/health", header);
      login(header);
    } catch (err) {
      setMsalError(err instanceof Error ? err.message : "SSO login failed");
    } finally {
      setLoading(false);
    }
  }, [login]);

  const handleCredentialsLogin = useCallback(async () => {
    const header = makeAuthHeader(username, password);
    setLoading(true);
    setError("");
    try {
      await adminFetch("/admin/health", header);
      login(header);
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }, [username, password, login]);

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

          {/* Microsoft SSO */}
          {isMsalConfigured && authMode === "sso" && (
            <div className="space-y-4">
              <button
                type="button"
                disabled={loading || !msalReady}
                onClick={() => void handleMsalLogin()}
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

              {msalError && (
                <p className="text-center text-sm text-destructive">{msalError}</p>
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
                onClick={() => setAuthMode("credentials")}
                className="w-full text-center text-sm transition"
                style={{ color: "var(--app-muted)" }}
              >
                Sign in with credentials
              </button>
            </div>
          )}

          {/* Credentials form */}
          {authMode === "credentials" && (
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

              {isMsalConfigured && (
                <button
                  type="button"
                  onClick={() => setAuthMode("sso")}
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
