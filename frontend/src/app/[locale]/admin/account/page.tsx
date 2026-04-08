"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "../admin-auth-context";
import { PanelError, SectionPanel } from "../admin-metric-panels";
import { getAdminPagePath } from "../../../../lib/admin-paths";

function getInitials(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? "D"}`.toUpperCase();
  }

  return label.slice(0, 2).toUpperCase() || "AD";
}

function getAuthMethodLabel(
  authMethod: "microsoft" | undefined,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (authMethod) {
    case "microsoft":
      return t("account.authMethodMicrosoft");
    default:
      return t("account.notAvailable");
  }
}

export default function AdminAccountPage() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const displayName =
    admin?.name?.trim() || admin?.email || admin?.actor || t("shell.operatorFallback");
  const initials = getInitials(displayName);
  const authMethodLabel = getAuthMethodLabel(admin?.authMethod, t);

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await logout();
    } catch {
      setError(t("account.signOutFailed"));
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl border p-6"
        style={{
          borderColor: "var(--app-border)",
          background: "var(--app-surface-strong)",
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold"
              style={{
                background: "var(--app-fg)",
                color: "var(--app-bg)",
              }}
            >
              {initials}
            </span>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--app-fg)" }}>
                {displayName}
              </h2>
              <p className="text-sm" style={{ color: "var(--app-muted)" }}>
                {admin?.email ?? t("account.notAvailable")}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "var(--app-muted)" }}>
                {t("shell.role")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-40"
            style={{
              borderColor: "var(--app-border)",
              color: "var(--app-fg)",
            }}
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? t("account.signingOut") : t("account.signOut")}
          </button>
        </div>

        {error ? <div className="mt-4"><PanelError message={error} /></div> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title={t("account.identity")}>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt style={{ color: "var(--app-muted)" }}>{t("account.name")}</dt>
              <dd className="text-right" style={{ color: "var(--app-fg)" }}>
                {displayName}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt style={{ color: "var(--app-muted)" }}>{t("account.accountEmail")}</dt>
              <dd className="text-right" style={{ color: "var(--app-fg)" }}>
                {admin?.email ?? t("account.notAvailable")}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt style={{ color: "var(--app-muted)" }}>{t("account.actor")}</dt>
              <dd className="text-right font-mono text-xs sm:text-sm" style={{ color: "var(--app-fg)" }}>
                {admin?.actor ?? t("account.notAvailable")}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt style={{ color: "var(--app-muted)" }}>{t("account.role")}</dt>
              <dd className="text-right" style={{ color: "var(--app-fg)" }}>
                {t("shell.role")}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt style={{ color: "var(--app-muted)" }}>{t("account.authMethod")}</dt>
              <dd className="text-right" style={{ color: "var(--app-fg)" }}>
                {authMethodLabel}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt style={{ color: "var(--app-muted)" }}>{t("account.managedBy")}</dt>
              <dd className="text-right" style={{ color: "var(--app-fg)" }}>
                {t("account.managedByValue")}
              </dd>
            </div>
          </dl>
        </SectionPanel>

        <SectionPanel title={t("account.securityTitle")}>
          <div
            className="rounded-xl border px-4 py-4 text-sm"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-muted)",
            }}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--app-fg)" }} />
              <p style={{ color: "var(--app-muted)" }}>{t("account.securityBody")}</p>
            </div>
          </div>
        </SectionPanel>
      </div>

      <SectionPanel title={t("account.supportTitle")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={getAdminPagePath(pathname, "overview")}
            className="rounded-xl border px-4 py-4 text-sm transition hover:opacity-95"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-muted)",
              color: "var(--app-fg)",
            }}
          >
            {t("account.supportOverview")}
          </Link>
          <Link
            href={getAdminPagePath(pathname, "search")}
            className="rounded-xl border px-4 py-4 text-sm transition hover:opacity-95"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-muted)",
              color: "var(--app-fg)",
            }}
          >
            {t("account.supportSearch")}
          </Link>
        </div>
      </SectionPanel>
    </div>
  );
}
