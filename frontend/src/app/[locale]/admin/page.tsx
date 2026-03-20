"use client";

import { useState, useCallback, useEffect } from "react";
import { Link } from "../../../i18n/navigation.js";
import { ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import {
  adminFetch,
  makeAuthHeader,
  type HealthResponse,
  type OverviewResponse,
} from "./admin-api.js";
import { HealthPanel, OverviewPanel, QueuesPanel } from "./admin-panels.js";
import { getMsalInstance, loginRequest, isMsalConfigured } from "../../../lib/msal-config.js";

// ---------------------------------------------------------------------------
// Microsoft SSO icon
// ---------------------------------------------------------------------------

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Admin Dashboard Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authHeader, setAuthHeader] = useState("");
  const [authError, setAuthError] = useState(false);
  const [msalReady, setMsalReady] = useState(false);
  const [msalError, setMsalError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"sso" | "credentials">(
    isMsalConfigured ? "sso" : "credentials",
  );

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize MSAL
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

  const refresh = useCallback(async () => {
    if (!authHeader) return;
    setLoading(true);
    setError(null);
    try {
      const [h, o] = await Promise.all([
        adminFetch<HealthResponse>("/admin/health", authHeader),
        adminFetch<OverviewResponse>("/admin/overview", authHeader),
      ]);
      setHealth(h);
      setOverview(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const handleMsalLogin = useCallback(async () => {
    const msalInstance = getMsalInstance();
    if (!msalInstance) return;
    setLoading(true);
    setMsalError(null);
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      const token = response.accessToken;
      const header = `Bearer ${token}`;
      const [h, o] = await Promise.all([
        adminFetch<HealthResponse>("/admin/health", header),
        adminFetch<OverviewResponse>("/admin/overview", header),
      ]);
      setAuthHeader(header);
      setAuthenticated(true);
      setHealth(h);
      setOverview(o);
    } catch (err) {
      setMsalError(err instanceof Error ? err.message : "SSO login failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async () => {
    const header = makeAuthHeader(username, password);
    setLoading(true);
    setAuthError(false);
    setError(null);
    try {
      const [h, o] = await Promise.all([
        adminFetch<HealthResponse>("/admin/health", header),
        adminFetch<OverviewResponse>("/admin/overview", header),
      ]);
      setAuthHeader(header);
      setAuthenticated(true);
      setHealth(h);
      setOverview(o);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, [username, password]);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Access</h1>
            <p className="mt-2 text-sm text-gray-500">
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
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <MicrosoftIcon className="h-5 w-5" />
                    Sign in with Microsoft
                  </>
                )}
              </button>

              {msalError && (
                <p className="text-center text-sm text-destructive">{msalError}</p>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-400">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAuthMode("credentials")}
                className="w-full text-center text-sm text-gray-500 transition hover:text-gray-900"
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
                void handleLogin();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="admin-user" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="admin-user"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="admin-pass" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="admin-pass"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {authError && (
                <p className="text-sm text-destructive">
                  Invalid credentials. Please try again.
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </button>

              {isMsalConfigured && (
                <button
                  type="button"
                  onClick={() => setAuthMode("sso")}
                  className="w-full text-center text-sm text-gray-500 transition hover:text-gray-900"
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link href="/" className="text-sm text-gray-500 transition hover:text-gray-900">
              ← Back to site
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {health && <HealthPanel health={health} />}
        {overview && <OverviewPanel overview={overview} />}
        {health && <QueuesPanel queues={health.queues} />}
      </main>
    </div>
  );
}
