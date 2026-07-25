"use client";

import type { AdminFinancialsResponse } from "@episto/shared";
import { DeliveryMixChart } from "@/components/ui/chart";
import { SectionPanel } from "../admin-metric-panels";
import { formatChf } from "../dashboard/dashboard-format";

const DELIVERY_LABEL: Record<string, string> = {
  standard: "Standard",
  registered: "Registered",
};
const PRICING_LABEL: Record<string, string> = {
  full_price: "Full price",
  promo: "Promo",
  free: "Free",
};

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`pb-2 text-[11px] font-medium ${right ? "text-right" : "text-left"}`}
      style={{ color: "var(--app-muted)" }}
    >
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td
      className={`py-1.5 text-sm ${right ? "text-right font-mono tabular-nums" : ""}`}
      style={{ color: "var(--app-fg)" }}
    >
      {children}
    </td>
  );
}

export function DeliveryTierTable({ data }: { data: AdminFinancialsResponse }) {
  return (
    <SectionPanel title="Revenue by delivery tier">
      {data.byDelivery.length === 0 ? (
        <Empty />
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--app-border)" }}>
              <Th>Tier</Th>
              <Th right>Orders</Th>
              <Th right>Gross</Th>
              <Th right>Contribution (est.)</Th>
            </tr>
          </thead>
          <tbody>
            {data.byDelivery.map((row) => (
              <tr
                key={row.deliveryType}
                className="border-b"
                style={{ borderColor: "var(--app-border)" }}
              >
                <Td>{DELIVERY_LABEL[row.deliveryType] ?? row.deliveryType}</Td>
                <Td right>{row.orders}</Td>
                <Td right>{formatChf(row.grossCents)}</Td>
                <Td right>{formatChf(row.contributionCents)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionPanel>
  );
}

export function ServicePostageSplit({ data }: { data: AdminFinancialsResponse }) {
  const { serviceMarkupCents, postageCents } = data.componentSplit;
  const total = serviceMarkupCents + postageCents;
  return (
    <SectionPanel title="What we keep vs pass-through">
      {total === 0 ? (
        <Empty />
      ) : (
        <>
          <DeliveryMixChart
            data={[
              {
                label: "Service (kept)",
                value: Math.round(serviceMarkupCents / 100),
                color: "var(--app-fg)",
              },
              {
                label: "Postage (pass-through)",
                value: Math.round(postageCents / 100),
                color: "var(--app-muted)",
              },
            ]}
          />
          <div
            className="mt-3 flex justify-between text-[11px]"
            style={{ color: "var(--app-muted)" }}
          >
            <span>Service markup {formatChf(serviceMarkupCents)}</span>
            <span>Swiss Post postage {formatChf(postageCents)}</span>
          </div>
        </>
      )}
    </SectionPanel>
  );
}

export function PricingBreakdown({ data }: { data: AdminFinancialsResponse }) {
  return (
    <SectionPanel title="Full-price vs promo vs free">
      {data.byPricing.length === 0 ? (
        <Empty />
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--app-border)" }}>
              <Th>Segment</Th>
              <Th right>Orders</Th>
              <Th right>Gross</Th>
              <Th right>Contribution (est.)</Th>
            </tr>
          </thead>
          <tbody>
            {data.byPricing.map((row) => (
              <tr
                key={row.segment}
                className="border-b"
                style={{ borderColor: "var(--app-border)" }}
              >
                <Td>{PRICING_LABEL[row.segment] ?? row.segment}</Td>
                <Td right>{row.orders}</Td>
                <Td right>{formatChf(row.grossCents)}</Td>
                <Td right>{formatChf(row.contributionCents)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionPanel>
  );
}

export function VatSummary({ data }: { data: AdminFinancialsResponse }) {
  return (
    <SectionPanel title="VAT summary">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--app-border)" }}>
            <Th>Rate</Th>
            <Th right>Net</Th>
            <Th right>VAT</Th>
            <Th right>Gross</Th>
          </tr>
        </thead>
        <tbody>
          {data.vat.rows.map((row) => (
            <tr
              key={row.rateBp}
              className="border-b"
              style={{ borderColor: "var(--app-border)" }}
            >
              <Td>{(row.rateBp / 100).toFixed(1)}%</Td>
              <Td right>{formatChf(row.netCents)}</Td>
              <Td right>{formatChf(row.vatCents)}</Td>
              <Td right>{formatChf(row.grossCents)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 text-[11px]" style={{ color: "var(--app-muted)" }}>
        <div className="flex justify-between">
          <span>Collected</span>
          <span className="font-mono">{formatChf(data.vat.collectedCents)}</span>
        </div>
        <div className="flex justify-between">
          <span>Less refunded VAT (est.)</span>
          <span className="font-mono">-{formatChf(data.vat.refundedVatCents)}</span>
        </div>
        <div
          className="flex justify-between border-t pt-1 font-semibold"
          style={{ borderColor: "var(--app-border)", color: "var(--app-fg)" }}
        >
          <span>Net VAT</span>
          <span className="font-mono">{formatChf(data.vat.netCents)}</span>
        </div>
      </div>
    </SectionPanel>
  );
}

function Empty() {
  return (
    <p className="py-6 text-center text-xs" style={{ color: "var(--app-muted)" }}>
      No captured orders in this period yet.
    </p>
  );
}
