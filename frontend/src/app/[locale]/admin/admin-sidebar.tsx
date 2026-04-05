"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "./admin-auth-context";

const NAV_SECTIONS = [
  {
    label: "Dashboard",
    items: [
      { href: "overview", label: "Overview" },
      { href: "funnel", label: "Funnel Analysis" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "sessions", label: "Sessions" },
      { href: "flags", label: "Flags & Queue" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "retention", label: "Retention" },
      { href: "health", label: "Health" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const locale = pathname.split("/")[1] ?? "en-CH";
  const basePath = `/${locale}/admin`;

  return (
    <nav
      className="flex w-[220px] shrink-0 flex-col border-r"
      style={{
        background: "var(--app-surface-strong)",
        borderColor: "var(--app-border)",
      }}
    >
      <div
        className="px-5 pb-6 pt-6 text-sm font-semibold tracking-wide"
        style={{ color: "var(--app-fg)" }}
      >
        ◆ SWISS MAIL ADMIN
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div
              className="px-5 pb-1.5 pt-4 text-[10px] uppercase tracking-widest"
              style={{ color: "var(--app-muted)" }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const href = `${basePath}/${item.href}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={item.href}
                  href={href}
                  className="block border-l-[3px] px-5 py-2.5 text-[13px] transition-colors"
                  style={{
                    borderColor: active ? "var(--app-fg)" : "transparent",
                    color: active ? "var(--app-fg)" : "var(--app-muted)",
                    background: active ? "var(--app-surface-muted)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <button
        onClick={logout}
        className="m-4 rounded-lg border px-4 py-2 text-xs"
        style={{
          borderColor: "var(--app-border)",
          color: "var(--app-muted)",
        }}
      >
        Sign Out
      </button>
    </nav>
  );
}
