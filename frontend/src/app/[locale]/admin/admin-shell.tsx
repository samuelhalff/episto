"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useCallback } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useAdminAuth } from "./admin-auth-context";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopBar } from "./admin-top-bar";
import {
  buildAdminMicrosoftLoginUrl,
  getAdminAuthErrorMessage,
} from "./admin-auth-client";

export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const { ready, authenticated, microsoftSsoEnabled } = useAdminAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sanitizedReturnTo = useMemo(() => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("authError");
    const nextSearch = nextSearchParams.toString();
    return nextSearch.length > 0 ? `${pathname}?${nextSearch}` : pathname;
  }, [pathname, searchParams]);

  const authErrorMessageKey = getAdminAuthErrorMessage(searchParams.get("authError"));
  const authErrorMessage = authErrorMessageKey ? t(authErrorMessageKey) : null;

  const handleMicrosoftLogin = useCallback(() => {
    setLoading(true);
    window.location.assign(
      buildAdminMicrosoftLoginUrl(
        process.env.NEXT_PUBLIC_API_URL ?? "/api",
        sanitizedReturnTo,
      ),
    );
  }, [sanitizedReturnTo]);

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
              {t("login.title")}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--app-muted)" }}>
              {t("login.description")}
            </p>
          </div>

          {microsoftSsoEnabled ? (
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
                  t("login.microsoft")
                )}
              </button>

              {authErrorMessage && (
                <p className="text-center text-sm text-destructive">{authErrorMessage}</p>
              )}
            </div>
          ) : (
            <p className="text-center text-sm" style={{ color: "var(--app-muted)" }}>
              {t("login.unavailable")}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--app-bg)" }}>
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopBar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
