"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";

import { fetchAdminFixedCosts, saveAdminFixedCosts } from "./financials-api";

/**
 * Inline editor for the current month's manual fixed operating costs. Setting a
 * value lets the P&L reach a real operating result. This is a mutable INPUT, not
 * a frozen cost basis.
 */
export function FixedCostsEditor({
  yearMonth,
  enabled,
}: {
  yearMonth: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: queryKeys.admin.fixedCosts(yearMonth),
    queryFn: () => fetchAdminFixedCosts(yearMonth),
    enabled,
  });

  const [draft, setDraft] = useState<{
    yearMonth: string;
    amount: string;
    note: string;
  } | null>(null);
  const serverAmount =
    q.data?.amountCents != null ? (q.data.amountCents / 100).toString() : "";
  const serverNote = q.data?.note ?? "";
  const amount = draft?.yearMonth === yearMonth ? draft.amount : serverAmount;
  const note = draft?.yearMonth === yearMonth ? draft.note : serverNote;

  const updateDraft = (next: { amount?: string; note?: string }) => {
    setDraft({
      yearMonth,
      amount: next.amount ?? amount,
      note: next.note ?? note,
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      saveAdminFixedCosts({
        yearMonth,
        amountCents: Math.round(Number(amount) * 100),
        note: note.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.fixedCosts(yearMonth),
      });
      void queryClient.invalidateQueries({ queryKey: ["admin", "financials"] });
    },
  });

  const valid = amount !== "" && Number.isFinite(Number(amount)) && Number(amount) >= 0;

  return (
    <div className="space-y-3">
      <p className="text-[11px]" style={{ color: "var(--app-muted)" }}>
        Manual monthly fixed operating costs for {yearMonth} (CHF). Used only to reach the
        operating result — this is an editable input, not a frozen cost.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px]" style={{ color: "var(--app-muted)" }}>
            Amount (CHF)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => updateDraft({ amount: e.target.value })}
            className="w-36 rounded-md border px-3 py-1.5 text-sm"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-strong)",
              color: "var(--app-fg)",
            }}
          />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <span className="text-[11px]" style={{ color: "var(--app-muted)" }}>
            Note (optional)
          </span>
          <input
            type="text"
            value={note}
            maxLength={500}
            onChange={(e) => updateDraft({ note: e.target.value })}
            className="rounded-md border px-3 py-1.5 text-sm"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-strong)",
              color: "var(--app-fg)",
            }}
          />
        </label>
        <button
          type="button"
          disabled={!valid || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--app-fg)", color: "var(--app-bg)" }}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {mutation.isError ? (
        <p className="text-[11px] text-destructive">Failed to save fixed costs.</p>
      ) : null}
      {q.data?.updatedAt ? (
        <p className="text-[11px]" style={{ color: "var(--app-muted)" }}>
          Last set {new Date(q.data.updatedAt).toLocaleString("en-CH")}
        </p>
      ) : null}
    </div>
  );
}
