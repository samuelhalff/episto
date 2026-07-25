import type {
  AdminFinancialsResponse,
  AdminFinancialsPeriod,
  AdminFixedCostsResponse,
} from "@episto/shared";
import { getApiBase } from "@/lib/api";
import { downloadFile } from "@/lib/download-file";
import { adminFetch } from "../admin-api";

export type FinancialsPeriod = AdminFinancialsPeriod;

export const FINANCIALS_PERIODS: FinancialsPeriod[] = [
  "today",
  "7d",
  "30d",
  "month",
  "ytd",
];

export function fetchAdminFinancials(period: FinancialsPeriod) {
  return adminFetch<AdminFinancialsResponse>(
    `/admin/metrics/financials?period=${period}`,
  );
}

export function fetchAdminFixedCosts(yearMonth: string) {
  return adminFetch<AdminFixedCostsResponse>(
    `/admin/financials/fixed-costs?month=${yearMonth}`,
  );
}

export async function saveAdminFixedCosts(input: {
  yearMonth: string;
  amountCents: number;
  note: string | null;
}): Promise<AdminFixedCostsResponse> {
  const res = await fetch(`${getApiBase()}/v1/admin/financials/fixed-costs`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Failed to save fixed costs (${res.status})`);
  }
  return res.json() as Promise<AdminFixedCostsResponse>;
}

export function downloadFinancialsCsv(period: FinancialsPeriod): Promise<void> {
  return downloadFile(
    `/v1/admin/financials.csv?period=${period}`,
    "episto-financials.csv",
  );
}
