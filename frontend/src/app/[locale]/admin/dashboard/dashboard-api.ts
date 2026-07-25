import type {
  AdminDashboardResponse,
  AdminLettersResponse,
  AdminMoneyResponse,
  AdminFeedbackResponse,
  AdminRefundsResponse,
} from "@episto/shared";
import { downloadFile } from "@/lib/download-file";
import { adminFetch } from "../admin-api";

export type DashboardPeriod = "today" | "7d" | "30d";

export interface LetterFilters {
  deliveryType?: string;
  dispatchState?: string;
  paymentState?: string;
}

function filterQuery(period: string, filters: LetterFilters, page: number): string {
  const params = new URLSearchParams({ period, page: String(page) });
  if (filters.deliveryType) params.set("deliveryType", filters.deliveryType);
  if (filters.dispatchState) params.set("dispatchState", filters.dispatchState);
  if (filters.paymentState) params.set("paymentState", filters.paymentState);
  return params.toString();
}

export function fetchAdminDashboard(period: DashboardPeriod) {
  return adminFetch<AdminDashboardResponse>(`/admin/metrics/dashboard?period=${period}`);
}

export function fetchAdminLetters(
  period: DashboardPeriod,
  filters: LetterFilters,
  page: number,
) {
  return adminFetch<AdminLettersResponse>(
    `/admin/letters?${filterQuery(period, filters, page)}`,
  );
}

export function fetchAdminMoney(period: DashboardPeriod) {
  return adminFetch<AdminMoneyResponse>(`/admin/money?period=${period}`);
}

export function fetchAdminFeedbackLog(period: DashboardPeriod) {
  return adminFetch<AdminFeedbackResponse>(`/admin/feedback?period=${period}`);
}

export function fetchAdminRefunds() {
  return adminFetch<AdminRefundsResponse>("/admin/refunds");
}

export function downloadAdminLettersCsv(
  period: DashboardPeriod,
  filters: LetterFilters,
): Promise<void> {
  // The CSV route lives under /v1 (mirrors the audience CSV export).
  const query = filterQuery(period, filters, 1);
  return downloadFile(`/v1/admin/letters.csv?${query}`, "episto-letters.csv");
}
