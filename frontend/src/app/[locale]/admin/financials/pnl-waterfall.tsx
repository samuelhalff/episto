"use client";

import type { AdminPnlWaterfall } from "@episto/shared";
import { formatChf } from "../dashboard/dashboard-format";

/**
 * P&L waterfall as a labelled step table. Each cost line renders subtractive
 * (negative, muted) and the CM1/CM2/operating-result rows render bold. Estimated
 * and unset lines are annotated inline.
 */
export function PnlWaterfall({ pnl }: { pnl: AdminPnlWaterfall }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {pnl.lines.map((line) => {
            const isResult = line.kind === "result";
            const isSubtotal = line.kind === "subtotal";
            const bold = isResult || isSubtotal;
            const negative = line.amountCents < 0;
            const amount = line.unset ? null : line.amountCents;
            return (
              <tr
                key={line.key}
                className="border-b"
                style={{ borderColor: "var(--app-border)" }}
              >
                <td
                  className="py-2 pr-4"
                  style={{
                    color: bold ? "var(--app-fg)" : "var(--app-muted)",
                    fontWeight: bold ? 600 : 400,
                  }}
                >
                  {line.label}
                  {line.estimated ? (
                    <span
                      className="ml-2 text-[10px] uppercase tracking-wide"
                      style={{ color: "var(--app-muted)" }}
                    >
                      estimated
                    </span>
                  ) : null}
                  {line.note ? (
                    <span
                      className="ml-2 text-[11px]"
                      style={{ color: "var(--app-muted)" }}
                    >
                      {line.note}
                    </span>
                  ) : null}
                </td>
                <td
                  className="py-2 text-right font-mono tabular-nums"
                  style={{
                    color: line.unset
                      ? "var(--app-muted)"
                      : isResult
                        ? line.amountCents < 0
                          ? "var(--app-danger, #dc2626)"
                          : "var(--app-fg)"
                        : negative
                          ? "var(--app-muted)"
                          : "var(--app-fg)",
                    fontWeight: bold ? 600 : 400,
                  }}
                >
                  {amount == null ? "—" : formatChf(amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
