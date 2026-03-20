"use client";

import { useState, useCallback } from "react";
import { Link } from "../../../i18n/navigation.js";
import { ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import {
  adminFetch,
  makeAuthHeader,
  type HealthResponse,
  type OverviewResponse,
} from "./admin-api.js";
import { HealthPanel, OverviewPanel, QueuesPanel } from "./admin-panels.js";

// ---------------------------------------------------------------------------
// Admin Dashboard Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authHeader, setAuthHeader] = useState("");
  const [authError, setAuthError] = useState(false);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-navy" />
            <h1 className="mt-4 text-xl font-bold text-navy">Admin Access</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter your admin credentials to continue.
            </p>
          </div>

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
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
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
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
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
              className="w-full rounded-lg bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-navy" />
            <h1 className="text-lg font-bold text-navy">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link href="/" className="text-sm text-gray-500 hover:text-navy">
              ← Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
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
