"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
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

  if (pathname.includes("/admin/retention")) {
    return {
      title: t("retention.title"),
      description: t("retention.description"),
    };
  }

  return {
    title: t("shell.defaultTitle"),
    description: t("shell.defaultDescription"),
  };
}

interface AdminTopBarProps {
  onMenuToggle: () => void;
}

export function AdminTopBar({ onMenuToggle }: AdminTopBarProps) {
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
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:gap-4 lg:py-4">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-md p-2 lg:hidden"
          style={{ color: "var(--app-muted)" }}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Title area */}
        <div className="min-w-0 flex-1">
          <p
            className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] sm:block"
            style={{ color: "var(--app-muted)" }}
          >
            {t("shell.role")}
          </p>
          <h1
            className="truncate text-lg font-semibold sm:mt-1 sm:text-xl"
            style={{ color: "var(--app-fg)" }}
          >
            {routeMeta.title}
          </h1>
          <p
            className="mt-0.5 hidden max-w-3xl text-sm sm:block"
            style={{ color: "var(--app-muted)" }}
          >
            {routeMeta.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={searchHref}
            aria-label={t("shell.search")}
            className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium transition hover:opacity-90 sm:px-4"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-strong)",
              color: "var(--app-fg)",
            }}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t("shell.search")}</span>
          </Link>

          <Link
            href={accountHref}
            aria-label={t("shell.account")}
            className="flex h-11 min-w-0 items-center gap-2 rounded-full border pl-1 pr-3 transition hover:opacity-90 sm:gap-3 sm:pr-4"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-strong)",
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold leading-none sm:text-sm"
              style={{
                background: "var(--app-fg)",
                color: "var(--app-bg)",
              }}
            >
              {initials}
            </span>
            <span className="hidden min-w-0 sm:block">
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
