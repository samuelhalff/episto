"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "./admin-auth-context";
import { getAdminPagePath } from "../../../lib/admin-paths";

function getAdminDisplayName(
  admin: ReturnType<typeof useAdminAuth>["admin"],
  fallback: string,
): string {
  return admin?.name?.trim() || admin?.email || admin?.actor || fallback;
}

function getAdminInitials(
  admin: ReturnType<typeof useAdminAuth>["admin"],
  fallback: string,
): string {
  const label = getAdminDisplayName(admin, fallback).trim();
  if (!label) {
    return "AD";
  }

  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? "D"}`.toUpperCase();
  }

  return label.slice(0, 2).toUpperCase();
}

function getRouteMeta(pathname: string, t: ReturnType<typeof useTranslations>) {
  if (pathname.includes("/admin/account")) {
    return {
      title: t("account.title"),
      description: t("account.description"),
    };
  }

  if (pathname.includes("/admin/search")) {
    return {
      title: t("search.title"),
      description: t("search.description"),
    };
  }

  if (pathname.includes("/admin/sessions")) {
    return {
      title: t("sessions.title"),
      description: t("sessions.description"),
    };
  }

  if (pathname.includes("/admin/flags")) {
    return {
      title: t("flags.title"),
      description: t("flags.description"),
    };
  }

  if (pathname.includes("/admin/health")) {
    return {
      title: t("health.title"),
      description: t("health.description"),
    };
  }

  if (pathname.includes("/admin/funnel")) {
    return {
      title: t("funnel.title"),
      description: t("funnel.description"),
    };
  }

  if (pathname.includes("/admin/overview")) {
    return {
      title: t("overview.title"),
      description: t("overview.description"),
    };
  }

  return {
    title: t("shell.defaultTitle"),
    description: t("shell.defaultDescription"),
  };
}

export function AdminTopBar() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const { admin } = useAdminAuth();

  const accountHref = getAdminPagePath(pathname, "account");
  const searchHref = getAdminPagePath(pathname, "search");
  const routeMeta = getRouteMeta(pathname, t);
  const fallbackName = t("shell.operatorFallback");
  const displayName = getAdminDisplayName(admin, fallbackName);
  const initials = getAdminInitials(admin, fallbackName);

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{
        borderColor: "var(--app-border)",
        background: "color-mix(in srgb, var(--app-bg) 92%, transparent)",
      }}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--app-muted)" }}
          >
            {t("shell.role")}
          </p>
          <h1 className="mt-1 text-xl font-semibold" style={{ color: "var(--app-fg)" }}>
            {routeMeta.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm" style={{ color: "var(--app-muted)" }}>
            {routeMeta.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={searchHref}
            aria-label={t("shell.search")}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:opacity-90"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-strong)",
              color: "var(--app-fg)",
            }}
          >
            <Search className="h-4 w-4" />
            {t("shell.search")}
          </Link>

          <Link
            href={accountHref}
            aria-label={t("shell.account")}
            className="flex min-w-0 items-center gap-3 rounded-full border px-2 py-2 pr-4 transition hover:opacity-90"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-strong)",
            }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
              style={{
                background: "var(--app-fg)",
                color: "var(--app-bg)",
              }}
            >
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium" style={{ color: "var(--app-fg)" }}>
                {displayName}
              </span>
              <span className="block truncate text-xs" style={{ color: "var(--app-muted)" }}>
                {t("shell.role")}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
