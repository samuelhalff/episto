"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { useAdminAuth } from "../admin-auth-context";
import { fetchAdminSearch } from "../admin-api";
import { PanelError, PanelLoading, SectionPanel } from "../admin-metric-panels";
import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { getAdminSearchResultPath } from "@/lib/admin-paths";

export default function SearchPage() {
  const pathname = usePathname();
  const { authenticated } = useAdminAuth();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  const search = useQuery({
    queryKey: queryKeys.admin.search(query),
    queryFn: () => fetchAdminSearch(query),
    enabled: authenticated && query.trim().length > 0,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(input.trim());
  }

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <div className="space-y-2">
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Search
        </h1>
        <p className="text-sm" style={{ color: "var(--app-muted)" }}>
          Find a session, draft, payment, or provider reference without opening raw
          provider data.
        </p>
      </div>

      <SectionPanel title="Lookup">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search by email, session ID, draft ID, Stripe ID, or provider reference"
            className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
            style={{
              background: "var(--app-surface-muted)",
              borderColor: "var(--app-border)",
              color: "var(--app-fg)",
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--app-muted)" }}>
              Current query: {query || "None"}
            </p>
            <button
              type="submit"
              disabled={input.trim().length < 1}
              className="rounded-lg px-4 py-2 text-xs font-medium transition disabled:opacity-40"
              style={{
                background: "var(--app-fg)",
                color: "var(--app-bg)",
              }}
            >
              Search
            </button>
          </div>
        </form>
      </SectionPanel>

      {query.trim().length === 0 ? null : (
        <SectionPanel title="Results">
          {search.isLoading ? (
            <PanelLoading />
          ) : search.error ? (
            <PanelError message={search.error.message || "Search failed"} />
          ) : search.data ? (
            search.data.data.length > 0 ? (
              <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
                {search.data.data.map((result) => (
                  <Link
                    key={`${result.kind}:${result.id}`}
                    href={getAdminSearchResultPath(pathname, result)}
                    className="block space-y-1 py-3 transition-opacity hover:opacity-80"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--app-fg)" }}
                      >
                        {result.label}
                      </p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                        style={{
                          background: "var(--app-surface-muted)",
                          color: "var(--app-muted)",
                        }}
                      >
                        {result.kind.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                      Matched on {result.matchedOn} ·{" "}
                      {new Date(result.createdAt).toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--app-muted)" }}>
                No matches found.
              </p>
            )
          ) : null}
        </SectionPanel>
      )}
    </div>
  );
}
