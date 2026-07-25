import type { AdminFinancialsResponse } from "@episto/shared";

/**
 * Flatten a financials response into a single hardened CSV. Sections are stacked
 * as (section, line, amount_cents, note) rows so the export carries the P&L
 * waterfall, the VAT summary and the category breakdowns in one file. Cells are
 * neutralized against spreadsheet formula injection by serializeHardenedCsv.
 */

export interface FinancialsCsvRow extends Record<string, string | number> {
  section: string;
  line: string;
  amount_cents: number;
  note: string;
}

export const FINANCIALS_CSV_COLUMNS = [
  "section",
  "line",
  "amount_cents",
  "note",
] as const satisfies readonly (keyof FinancialsCsvRow)[];

export function financialsCsvRows(data: AdminFinancialsResponse): FinancialsCsvRow[] {
  const rows: FinancialsCsvRow[] = [];

  for (const line of data.pnl.lines) {
    rows.push({
      section: "P&L",
      line: line.label,
      amount_cents: line.unset ? 0 : line.amountCents,
      note: line.unset ? "unset" : line.estimated ? "estimated" : (line.note ?? ""),
    });
  }

  for (const d of data.byDelivery) {
    rows.push({
      section: "Delivery",
      line: d.deliveryType,
      amount_cents: d.grossCents,
      note: `orders=${d.orders} cm1=${d.contributionCents}`,
    });
  }

  for (const p of data.byPricing) {
    rows.push({
      section: "Pricing",
      line: p.segment,
      amount_cents: p.grossCents,
      note: `orders=${p.orders} cm1=${p.contributionCents}`,
    });
  }

  rows.push({
    section: "Component",
    line: "service_markup",
    amount_cents: data.componentSplit.serviceMarkupCents,
    note: "what we keep",
  });
  rows.push({
    section: "Component",
    line: "postage",
    amount_cents: data.componentSplit.postageCents,
    note: "pass-through",
  });

  for (const v of data.vat.rows) {
    rows.push({
      section: "VAT",
      line: `rate_${v.rateBp}bp`,
      amount_cents: v.vatCents,
      note: `net=${v.netCents} gross=${v.grossCents}`,
    });
  }
  rows.push({
    section: "VAT",
    line: "net_of_refunds",
    amount_cents: data.vat.netCents,
    note: "NOT filing-ready — partial refunds/credit notes unreconciled",
  });

  return rows;
}
