"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { Download, Info } from "lucide-react";

import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { PnlTrendChart, type PnlTrendPoint } from "@/components/ui/chart";
import { useAdminAuth } from "../admin-auth-context";
import { SectionPanel, PanelLoading, PanelError } from "../admin-metric-panels";
import { formatChf, toChf } from "../dashboard/dashboard-format";
import {
  fetchAdminFinancials,
  downloadFinancialsCsv,
  FINANCIALS_PERIODS,
  type FinancialsPeriod,
} from "./financials-api";
import { PnlWaterfall } from "./pnl-waterfall";
import { FixedCostsEditor } from "./fixed-costs-editor";
import {
  DeliveryTierTable,
  ServicePostageSplit,
  PricingBreakdown,
  VatSummary,
} from "./financials-sections";

const PERIOD_LABEL: Record<FinancialsPeriod, string> = {
  today: "today",
  "7d": "7d",
  "30d": "30d",
  month: "month",
  ytd: "YTD",
};

function FinancialsPeriodSelector({
  value,
  onChange,
}: {
  value: FinancialsPeriod;
  onChange: (v: FinancialsPeriod) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border p-0.5"
      style={{ borderColor: "var(--app-border)" }}
    >
      {FINANCIALS_PERIODS.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="rounded-md px-3 py-1 text-xs font-medium transition"
          style={{
            background: value === opt ? "var(--app-fg)" : "transparent",
            color: value === opt ? "var(--app-bg)" : "var(--app-muted)",
          }}
        >
          {PERIOD_LABEL[opt]}
        </button>
      ))}
    </div>
  );
}

function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px]"
      style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function FinancialsPage() {
  const { authenticated } = useAdminAuth();
  const [period, setPeriod] = useState<FinancialsPeriod>("30d");

  const q = useQuery({
    queryKey: queryKeys.admin.financials(period),
    queryFn: () => fetchAdminFinancials(period),
    refetchInterval: 30_000,
    enabled: authenticated,
  });

  const d = q.data;

  const trend: PnlTrendPoint[] = d
    ? d.trend.map((p) => ({
        date: p.date.slice(5),
        netRevenue: toChf(p.netRevenueCents),
        contribution: toChf(p.contributionCents),
      }))
    : [];

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
            Financials
          </h2>
          <p className="text-sm" style={{ color: "var(--app-muted)" }}>
            A live P&amp;L from frozen per-order values: gross to operating result.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {d ? (
            <span className="text-xs" style={{ color: "var(--app-muted)" }}>
              Updated {new Date(d.generatedAt).toLocaleTimeString("en-CH")}
            </span>
          ) : null}
          <FinancialsPeriodSelector value={period} onChange={setPeriod} />
          <button
            type="button"
            onClick={() => void downloadFinancialsCsv(period)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
            style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {q.isLoading ? (
        <PanelLoading />
      ) : q.error ? (
        <PanelError message="Failed to load financials." />
      ) : d ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SectionPanel title="P&L waterfall">
              <PnlWaterfall pnl={d.pnl} />
              <div className="mt-4 space-y-2">
                {d.pnl.contributionEstimated ? (
                  <Caveat>
                    Contribution (CM1/CM2) is <strong>estimated</strong> — actual Stripe
                    fees are not yet persisted, so payment fees use the 2.9% + CHF 0.30
                    estimate.
                  </Caveat>
                ) : null}
                {d.pnl.adSpendSource === "stub" ? (
                  <Caveat>Ad spend is CHF 0.00 — no campaigns yet.</Caveat>
                ) : null}
                {d.pnl.operatingResultCents == null ? (
                  <Caveat>
                    Operating result excludes costs until fixed operating costs are
                    entered for {d.yearMonth} below.
                  </Caveat>
                ) : null}
              </div>
            </SectionPanel>

            <SectionPanel title="Fixed operating costs">
              <FixedCostsEditor yearMonth={d.yearMonth} enabled={authenticated} />
            </SectionPanel>
          </div>

          <SectionPanel title="Net revenue & contribution trend">
            {trend.length > 0 ? (
              <PnlTrendChart data={trend} />
            ) : (
              <p
                className="py-8 text-center text-xs"
                style={{ color: "var(--app-muted)" }}
              >
                No captured orders in this period yet.
              </p>
            )}
          </SectionPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            <DeliveryTierTable data={d} />
            <ServicePostageSplit data={d} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PricingBreakdown data={d} />
            <VatSummary data={d} />
          </div>

          <Caveat>
            The VAT summary is <strong>not filing-ready</strong>: partial refunds, credit
            notes and Stripe/accounting reconciliation are not yet applied. Refunded VAT
            is estimated by backing 8.1% out of refunded gross.
          </Caveat>

          {d.pnl.grossRevenueCents === 0 ? (
            <p className="text-center text-xs" style={{ color: "var(--app-muted)" }}>
              No receipts in this period — figures above will populate once orders are
              captured.
            </p>
          ) : (
            <p className="text-center text-[11px]" style={{ color: "var(--app-muted)" }}>
              Total gross {formatChf(d.pnl.grossRevenueCents)} across the period.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
