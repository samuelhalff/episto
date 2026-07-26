"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Filter,
  Mail,
  Search,
  Users,
  Flag,
  Trash2,
  Activity,
  Gauge,
  Wallet,
  Ticket,
  X,
} from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { useAdminAuth } from "./admin-auth-context";
import { getAdminPagePath } from "@/lib/admin-paths";

const NAV_SECTIONS = [
  {
    label: "Dashboard",
    items: [
      { href: "dashboard", label: "Dashboard", icon: Gauge },
      { href: "financials", label: "Financials", icon: Wallet },
      { href: "overview", label: "Overview", icon: BarChart3 },
      { href: "funnel", label: "Funnel Analysis", icon: Filter },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "audience", label: "Audience", icon: Mail },
      { href: "search", label: "Search", icon: Search },
      { href: "sessions", label: "Sessions", icon: Users },
      { href: "flags", label: "Flags & Queue", icon: Flag },
      { href: "promos", label: "Promo Codes", icon: Ticket },
    ],
  },
  {
    label: "System",
    items: [
      { href: "retention", label: "Retention", icon: Trash2 },
      { href: "health", label: "Health", icon: Activity },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 pb-6 pt-6">
        <div className="flex items-center gap-2">
          <Logo iconClassName="h-6 w-6" wordmarkClassName="text-base" />
          <span className="text-xs font-medium tracking-normal text-[var(--app-fg)]/60">
            admin
          </span>
        </div>
        {/* Close button visible only on mobile */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 lg:hidden"
          style={{ color: "var(--app-muted)" }}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div
              className="px-5 pb-1.5 pt-4 text-[10px] tracking-normal"
              style={{ color: "var(--app-muted)" }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const href = getAdminPagePath(pathname, item.href);
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 border-l-[3px] px-5 py-2.5 text-[13px] transition-colors"
                  style={{
                    borderColor: active ? "var(--app-fg)" : "transparent",
                    color: active ? "var(--app-fg)" : "var(--app-muted)",
                    background: active ? "var(--app-surface-muted)" : "transparent",
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {logoutError && <p className="px-4 text-xs text-destructive">{logoutError}</p>}

      <button
        onClick={() => {
          setLoggingOut(true);
          setLogoutError("");
          void logout()
            .catch(() => {
              setLogoutError("Sign-out failed. Please try again.");
            })
            .finally(() => {
              setLoggingOut(false);
            });
        }}
        disabled={loggingOut}
        className="m-4 rounded-lg border px-4 py-2 text-xs"
        style={{
          borderColor: "var(--app-border)",
          color: "var(--app-muted)",
        }}
      >
        {loggingOut ? "Signing out..." : "Sign Out"}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <nav
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r transition-transform duration-200 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--app-surface-strong)",
          borderColor: "var(--app-border)",
        }}
      >
        {sidebarContent}
      </nav>

      {/* Desktop sidebar — always visible */}
      <nav
        className="hidden w-[220px] shrink-0 flex-col border-r lg:flex"
        style={{
          background: "var(--app-surface-strong)",
          borderColor: "var(--app-border)",
        }}
      >
        {sidebarContent}
      </nav>
    </>
  );
}
