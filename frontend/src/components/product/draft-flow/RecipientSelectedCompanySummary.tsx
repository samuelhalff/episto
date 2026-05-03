"use client";

import type { RecipientCompanySearchResultType } from "@episto/shared";
import { PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";

interface RecipientSelectedCompanySummaryProps {
  selectedCompany: RecipientCompanySearchResultType;
  registryRef: string | null;
  onEdit: () => void;
}

export function RecipientSelectedCompanySummary({
  selectedCompany,
  registryRef,
  onEdit,
}: RecipientSelectedCompanySummaryProps) {
  const t = useTranslations("draft");

  return (
    <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            {t("selectedCompanyLabel")}
          </div>
          <div className="break-words text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedCompany.name}
          </div>
          {selectedCompany.legalSeat ? (
            <div className="break-words text-xs leading-5 text-zinc-500 dark:text-zinc-300">
              {t("companySearchSeat", {
                seat: selectedCompany.legalSeat,
              })}
            </div>
          ) : null}
          {registryRef ? (
            <div className="break-all text-xs font-medium text-zinc-400 dark:text-zinc-500">
              {registryRef}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--app-fg)] transition hover:border-emerald-300 hover:bg-[var(--app-surface-soft)]"
        >
          <PencilLine className="h-3.5 w-3.5" />
          {t("editCompanySelection")}
        </button>
      </div>
    </div>
  );
}
