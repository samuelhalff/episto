"use client";

import { useState } from "react";
import type { AdminPromo, AdminPromoKind } from "@episto/shared";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AppButton } from "@/components/ui/app-button";

export interface PromoFormSubmit {
  code: string;
  kind: AdminPromoKind;
  value: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  note: string | null;
  active: boolean;
}

/** ISO instant → value for <input type="datetime-local"> in the browser's local zone. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local datetime-local string → ISO instant (interpreted in the browser's zone). */
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function initialValueInput(promo: AdminPromo | null): string {
  if (!promo || promo.kind === "free") return "";
  return promo.kind === "fixed" ? (promo.value / 100).toString() : promo.value.toString();
}

const labelClass = "flex flex-col gap-1 text-[12px] text-[var(--app-muted)]";

/**
 * The stateful form body. Rendered only while the dialog is open (Radix unmounts
 * DialogContent on close), so useState initializers re-seed on every open — no
 * effect-driven state syncing.
 */
function PromoFormBody({
  promo,
  onSubmit,
  onCancel,
  pending,
  errorMessage,
}: {
  promo: AdminPromo | null;
  onSubmit: (values: PromoFormSubmit) => void;
  onCancel: () => void;
  pending: boolean;
  errorMessage: string | null;
}) {
  const isEdit = promo !== null;
  const codeLocked = isEdit && promo.redeemedCount > 0;

  const [code, setCode] = useState(promo?.code ?? "");
  const [kind, setKind] = useState<AdminPromoKind>(promo?.kind ?? "percent");
  const [valueInput, setValueInput] = useState(initialValueInput(promo));
  const [maxInput, setMaxInput] = useState(
    promo?.maxRedemptions == null ? "" : promo.maxRedemptions.toString(),
  );
  const [expiresInput, setExpiresInput] = useState(
    isoToLocalInput(promo?.expiresAt ?? null),
  );
  const [note, setNote] = useState(promo?.note ?? "");
  const [active, setActive] = useState(promo?.active ?? true);

  const value =
    kind === "free"
      ? 0
      : kind === "fixed"
        ? Math.round(Number(valueInput) * 100)
        : Math.round(Number(valueInput));
  const maxRedemptions = maxInput.trim() === "" ? null : Math.round(Number(maxInput));

  const codeValid = code.trim().length > 0;
  const valueValid =
    kind === "free" ||
    (Number.isFinite(value) && value >= 0 && (kind !== "percent" || value <= 100));
  const maxValid =
    maxRedemptions === null || (Number.isInteger(maxRedemptions) && maxRedemptions >= 1);
  const belowUsage =
    isEdit && maxRedemptions !== null && maxRedemptions < promo.redeemedCount;
  const canSubmit = codeValid && valueValid && maxValid && !belowUsage && !pending;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      code: code.trim().toUpperCase(),
      kind,
      value: kind === "free" ? 0 : value,
      maxRedemptions,
      expiresAt: localInputToIso(expiresInput),
      note: note.trim() === "" ? null : note.trim(),
      active,
    });
  }

  return (
    <div className="app-panel w-full max-w-md rounded-3xl p-6 text-left shadow-prominent-warm dark:shadow-prominent">
      <DialogTitle className="text-lg font-semibold tracking-tight text-[var(--app-fg)]">
        {isEdit ? "Edit promo code" : "New promo code"}
      </DialogTitle>
      <DialogDescription className="mt-1 text-[12px] text-[var(--app-muted)]">
        One-time codes use a redemption limit of 1. Leave the limit blank for an unlimited
        code. Expiry is entered in your local time.
      </DialogDescription>

      <div className="mt-4 flex flex-col gap-3">
        <label className={labelClass}>
          Code
          <Input
            value={code}
            disabled={codeLocked}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SAVE20"
          />
          {codeLocked ? (
            <span className="text-[11px]">Locked — this code has been redeemed.</span>
          ) : null}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Kind
            <Select value={kind} onValueChange={(v) => setKind(v as AdminPromoKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent off</SelectItem>
                <SelectItem value="fixed">Fixed CHF off</SelectItem>
                <SelectItem value="free">Free order</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className={labelClass}>
            {kind === "percent"
              ? "Percent (%)"
              : kind === "fixed"
                ? "Amount (CHF)"
                : "Value"}
            <Input
              type="number"
              min={0}
              step={kind === "fixed" ? "0.05" : "1"}
              value={kind === "free" ? "" : valueInput}
              disabled={kind === "free"}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder={kind === "free" ? "—" : "0"}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Redemption limit
            <Input
              type="number"
              min={1}
              step="1"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              placeholder="Unlimited"
            />
            <button
              type="button"
              onClick={() => setMaxInput("1")}
              className="self-start text-[11px] underline decoration-dotted"
            >
              Make one-time (1)
            </button>
          </label>

          <label className={labelClass}>
            Expires (optional)
            <Input
              type="datetime-local"
              value={expiresInput}
              onChange={(e) => setExpiresInput(e.target.value)}
            />
          </label>
        </div>

        <label className={labelClass}>
          Note (optional)
          <Input
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Internal note"
          />
        </label>

        {!isEdit ? (
          <label className="flex items-center justify-between text-[12px] text-[var(--app-fg)]">
            Active immediately
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
        ) : null}

        {belowUsage ? (
          <p className="text-[11px] text-destructive">
            Limit cannot be below the {promo.redeemedCount} redemption(s) already used.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-[11px] text-destructive">{errorMessage}</p>
        ) : null}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <AppButton variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </AppButton>
        <AppButton
          variant="primary"
          size="sm"
          disabled={!canSubmit}
          loading={pending}
          onClick={handleSubmit}
        >
          {isEdit ? "Save changes" : "Create code"}
        </AppButton>
      </div>
    </div>
  );
}

export function PromoFormDialog({
  open,
  onOpenChange,
  promo,
  onSubmit,
  pending,
  errorMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create; otherwise edit this code. */
  promo: AdminPromo | null;
  onSubmit: (values: PromoFormSubmit) => void;
  pending: boolean;
  errorMessage: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex items-center justify-center bg-transparent p-4 sm:p-6">
        <PromoFormBody
          key={promo?.id ?? "new"}
          promo={promo}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          pending={pending}
          errorMessage={errorMessage}
        />
      </DialogContent>
    </Dialog>
  );
}
