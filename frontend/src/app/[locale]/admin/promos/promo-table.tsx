"use client";

import { useState } from "react";
import { Check, Copy, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import type { AdminPromo, AdminPromoStatus } from "@episto/shared";

import { AppButton } from "@/components/ui/app-button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_TONE: Record<AdminPromoStatus, NonNullable<BadgeProps["tone"]>> = {
  active: "success",
  expired: "danger",
  inactive: "neutral",
};

function discountLabel(promo: AdminPromo): string {
  if (promo.kind === "free") return "Free order";
  if (promo.kind === "percent") return `${promo.value}%`;
  return `CHF ${(promo.value / 100).toFixed(2)}`;
}

function usageLabel(promo: AdminPromo): string {
  return `${promo.redeemedCount} / ${promo.maxRedemptions ?? "∞"}`;
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <AppButton
      variant="ghost"
      size="icon"
      title="Copy code"
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </AppButton>
  );
}

export function PromoTable({
  promos,
  onEdit,
  onToggle,
  onDelete,
  busyId,
}: {
  promos: AdminPromo[];
  onEdit: (promo: AdminPromo) => void;
  onToggle: (promo: AdminPromo) => void;
  onDelete: (promo: AdminPromo) => void;
  busyId: string | null;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Discount</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {promos.map((promo) => {
          const canReactivate = promo.status !== "expired";
          const busy = busyId === promo.id;
          return (
            <TableRow key={promo.id}>
              <TableCell className="font-mono text-[13px] font-medium">
                {promo.code}
              </TableCell>
              <TableCell>{discountLabel(promo)}</TableCell>
              <TableCell className="tabular-nums">{usageLabel(promo)}</TableCell>
              <TableCell className="text-[12px] text-[var(--app-muted)]">
                {promo.expiresAt
                  ? new Date(promo.expiresAt).toLocaleString("en-CH")
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge tone={STATUS_TONE[promo.status]}>{promo.status}</Badge>
              </TableCell>
              <TableCell className="max-w-[16rem] truncate text-[12px] text-[var(--app-muted)]">
                {promo.note ?? "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-0.5">
                  <CopyButton code={promo.code} />
                  <AppButton
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    disabled={busy}
                    onClick={() => onEdit(promo)}
                  >
                    <Pencil className="h-4 w-4" />
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    size="icon"
                    title={promo.active ? "Deactivate" : "Activate"}
                    disabled={busy || (!promo.active && !canReactivate)}
                    onClick={() => onToggle(promo)}
                  >
                    {promo.active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    disabled={busy}
                    onClick={() => onDelete(promo)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </AppButton>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
