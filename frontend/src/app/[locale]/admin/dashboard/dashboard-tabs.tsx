"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionPanel, PanelError, PanelLoading } from "../admin-metric-panels";
import {
  fetchAdminLetters,
  fetchAdminMoney,
  fetchAdminFeedbackLog,
  fetchAdminRefunds,
  downloadAdminLettersCsv,
  type DashboardPeriod,
  type LetterFilters,
} from "./dashboard-api";
import {
  formatChf,
  formatDateTime,
  PAYMENT_STATE_TONE,
  DISPATCH_STATE_TONE,
  PAYMENT_STATE_OPTIONS,
  DISPATCH_STATE_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
} from "./dashboard-format";

const CELL = "px-3 py-2 text-left align-middle";
const HEAD = "px-3 py-2 text-left text-[11px] font-medium text-[var(--app-muted)]";

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <p className="px-3 py-8 text-center text-xs" style={{ color: "var(--app-muted)" }}>
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Money tab
// ---------------------------------------------------------------------------

export function MoneyTab({
  period,
  enabled,
}: {
  period: DashboardPeriod;
  enabled: boolean;
}) {
  const q = useQuery({
    queryKey: queryKeys.admin.money(period),
    queryFn: () => fetchAdminMoney(period),
    enabled,
  });

  if (q.isLoading) return <PanelLoading />;
  if (q.error) return <PanelError message="Failed to load money figures." />;
  if (!q.data) return null;
  const d = q.data;

  const totals: Array<[string, string]> = [
    ["Gross", formatChf(d.grossCents)],
    ["Net (after refunds)", formatChf(d.netCents)],
    ["VAT collected", formatChf(d.vatCents)],
    ["Discounts", formatChf(d.discountCents)],
    ["Refunds", formatChf(d.refundsCents)],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border px-3 py-2"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-strong)",
            }}
          >
            <p className="text-[11px]" style={{ color: "var(--app-muted)" }}>
              {label}
            </p>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "var(--app-fg)" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <SectionPanel title="Promo codes">
        {d.promos.length === 0 ? (
          <Empty message="No promo redemptions in this period." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={HEAD}>Code</th>
                <th className={HEAD}>Redemptions</th>
                <th className={HEAD}>Discount given</th>
                <th className={HEAD}>Paid letters</th>
              </tr>
            </thead>
            <tbody>
              {d.promos.map((p) => (
                <tr
                  key={p.code}
                  className="border-t"
                  style={{ borderColor: "var(--app-border)" }}
                >
                  <td className={`${CELL} font-mono`}>{p.code}</td>
                  <td className={CELL}>{p.redemptions}</td>
                  <td className={`${CELL} font-mono`}>{formatChf(p.discountCents)}</td>
                  <td className={CELL}>{p.attributedPaidLetters}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </SectionPanel>

      <SectionPanel title="Refunds in period">
        {d.refunds.length === 0 ? (
          <Empty message="No refunds in this period." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={HEAD}>Ref</th>
                <th className={HEAD}>Amount</th>
                <th className={HEAD}>Date</th>
                <th className={HEAD}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {d.refunds.map((r) => (
                <tr
                  key={r.ref}
                  className="border-t"
                  style={{ borderColor: "var(--app-border)" }}
                >
                  <td className={`${CELL} font-mono`}>{r.ref}</td>
                  <td className={`${CELL} font-mono`}>{formatChf(r.amountCents)}</td>
                  <td className={CELL}>{formatDateTime(r.date)}</td>
                  <td className={CELL}>{r.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </SectionPanel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Letters tab (masked, filterable, paginated, CSV export)
// ---------------------------------------------------------------------------

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="min-w-[130px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{`All ${label.toLowerCase()}`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LettersTab({
  period,
  enabled,
}: {
  period: DashboardPeriod;
  enabled: boolean;
}) {
  const [filters, setFilters] = useState<LetterFilters>({});
  const [page, setPage] = useState(1);

  const filterKey = JSON.stringify(filters);
  const q = useQuery({
    queryKey: queryKeys.admin.letters(period, filterKey, page),
    queryFn: () => fetchAdminLetters(period, filters, page),
    enabled,
  });

  function setFilter(key: keyof LetterFilters, value: string) {
    setPage(1);
    setFilters((prev) => {
      const next = { ...prev };
      if (value === "all") delete next[key];
      else next[key] = value;
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Delivery"
          value={filters.deliveryType ?? "all"}
          onChange={(v) => setFilter("deliveryType", v)}
          options={DELIVERY_TYPE_OPTIONS}
        />
        <FilterSelect
          label="Dispatch"
          value={filters.dispatchState ?? "all"}
          onChange={(v) => setFilter("dispatchState", v)}
          options={DISPATCH_STATE_OPTIONS}
        />
        <FilterSelect
          label="Payment"
          value={filters.paymentState ?? "all"}
          onChange={(v) => setFilter("paymentState", v)}
          options={PAYMENT_STATE_OPTIONS}
        />
        <button
          type="button"
          onClick={() => void downloadAdminLettersCsv(period, filters)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {q.isLoading ? (
        <PanelLoading />
      ) : q.error ? (
        <PanelError message="Failed to load letters." />
      ) : !q.data || q.data.rows.length === 0 ? (
        <Empty message="No letters match these filters." />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th className={HEAD}>Date</th>
                <th className={HEAD}>Ref</th>
                <th className={HEAD}>Locale</th>
                <th className={HEAD}>Delivery</th>
                <th className={HEAD}>Amount</th>
                <th className={HEAD}>Payment</th>
                <th className={HEAD}>Dispatch</th>
                <th className={HEAD}>Tracking</th>
              </tr>
            </thead>
            <tbody>
              {q.data.rows.map((r) => (
                <tr
                  key={r.ref}
                  className="border-t"
                  style={{ borderColor: "var(--app-border)" }}
                >
                  <td className={CELL}>{formatDateTime(r.createdAt)}</td>
                  <td className={`${CELL} font-mono`}>{r.ref}</td>
                  <td className={CELL}>{r.locale ?? "—"}</td>
                  <td className={CELL}>{r.deliveryType ?? "—"}</td>
                  <td className={`${CELL} font-mono`}>{formatChf(r.amountCents)}</td>
                  <td className={CELL}>
                    <Badge tone={PAYMENT_STATE_TONE[r.paymentState]}>
                      {r.paymentState}
                    </Badge>
                  </td>
                  <td className={CELL}>
                    {r.dispatchState ? (
                      <Badge tone={DISPATCH_STATE_TONE[r.dispatchState]}>
                        {r.dispatchState}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${CELL} font-mono`}>{r.trackingNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div
            className="flex items-center justify-between text-xs"
            style={{ color: "var(--app-muted)" }}
          >
            <span>
              {q.data.total} letters · page {q.data.page} of {q.data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border px-3 py-1 disabled:opacity-40"
                style={{ borderColor: "var(--app-border)" }}
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= q.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border px-3 py-1 disabled:opacity-40"
                style={{ borderColor: "var(--app-border)" }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback tab
// ---------------------------------------------------------------------------

export function FeedbackTab({
  period,
  enabled,
}: {
  period: DashboardPeriod;
  enabled: boolean;
}) {
  const q = useQuery({
    queryKey: queryKeys.admin.feedback(period),
    queryFn: () => fetchAdminFeedbackLog(period),
    enabled,
  });

  if (q.isLoading) return <PanelLoading />;
  if (q.error) return <PanelError message="Failed to load the feedback log." />;
  if (!q.data || q.data.rows.length === 0)
    return <Empty message="No support events in this period." />;

  return (
    <Table>
      <thead>
        <tr>
          <th className={HEAD}>Date</th>
          <th className={HEAD}>Type</th>
          <th className={HEAD}>Locale</th>
          <th className={HEAD}>Draft</th>
          <th className={HEAD}>Excerpt</th>
          <th className={HEAD}>Actor</th>
        </tr>
      </thead>
      <tbody>
        {q.data.rows.map((r) => (
          <tr
            key={r.id}
            className="border-t"
            style={{ borderColor: "var(--app-border)" }}
          >
            <td className={CELL}>{formatDateTime(r.date)}</td>
            <td className={CELL}>
              <Badge tone="neutral">{r.eventType}</Badge>
            </td>
            <td className={CELL}>{r.locale ?? "—"}</td>
            <td className={`${CELL} font-mono`}>
              {r.draftId ? `draft-${r.draftId.slice(0, 8)}` : "—"}
            </td>
            <td className={`${CELL} max-w-[280px] truncate`}>{r.excerpt || "—"}</td>
            <td className={CELL}>{r.actor}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Refunds tab (current-state worklist)
// ---------------------------------------------------------------------------

export function RefundsTab({ enabled }: { enabled: boolean }) {
  const q = useQuery({
    queryKey: queryKeys.admin.refunds(),
    queryFn: () => fetchAdminRefunds(),
    enabled,
  });

  if (q.isLoading) return <PanelLoading />;
  if (q.error) return <PanelError message="Failed to load refunds." />;
  if (!q.data || q.data.rows.length === 0)
    return <Empty message="No pending or completed refunds." />;

  return (
    <Table>
      <thead>
        <tr>
          <th className={HEAD}>Ref</th>
          <th className={HEAD}>Draft</th>
          <th className={HEAD}>Amount</th>
          <th className={HEAD}>State</th>
          <th className={HEAD}>Reason</th>
          <th className={HEAD}>Date</th>
        </tr>
      </thead>
      <tbody>
        {q.data.rows.map((r) => (
          <tr
            key={`${r.ref}-${r.state}`}
            className="border-t"
            style={{ borderColor: "var(--app-border)" }}
          >
            <td className={`${CELL} font-mono`}>{r.ref}</td>
            <td className={`${CELL} font-mono`}>{`draft-${r.draftId.slice(0, 8)}`}</td>
            <td className={`${CELL} font-mono`}>{formatChf(r.amountCents)}</td>
            <td className={CELL}>
              <Badge tone={r.state === "refund_pending" ? "warning" : "neutral"}>
                {r.state}
              </Badge>
            </td>
            <td className={CELL}>{r.reason ?? "—"}</td>
            <td className={CELL}>{formatDateTime(r.date)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
