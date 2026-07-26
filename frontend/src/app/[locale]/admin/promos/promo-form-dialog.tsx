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

type Usage = "one_time" | "unlimited" | "limited";

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

function initialUsage(promo: AdminPromo | null): Usage {
  if (!promo) return "one_time";
  if (promo.maxRedemptions === null) return "unlimited";
  if (promo.maxRedemptions === 1) return "one_time";
  return "limited";
}

function initialValueInput(promo: AdminPromo | null): string {
  if (!promo || promo.kind === "free") return "";
  return promo.kind === "fixed" ? (promo.value / 100).toString() : promo.value.toString();
}

const fieldClass = "flex flex-col gap-1.5 text-[12px] text-[var(--app-muted)]";
const helpClass = "text-[11px] text-[var(--app-muted)]";

/**
 * The stateful form body. Rendered only while the dialog is open (Radix unmounts
 * DialogContent on close), so useState initializers re-seed on every open — no
 * effect-driven state syncing. Fields map to three owner decisions — what
 * discount, how often, until when — rather than the raw DB columns.
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
  const [usage, setUsage] = useState<Usage>(initialUsage(promo));
  const [limitInput, setLimitInput] = useState(
    promo && promo.maxRedemptions && promo.maxRedemptions > 1
      ? promo.maxRedemptions.toString()
      : "",
  );
  const [expiryMode, setExpiryMode] = useState<"none" | "at">(
    promo?.expiresAt ? "at" : "none",
  );
  const [expiresInput, setExpiresInput] = useState(
    isoToLocalInput(promo?.expiresAt ?? null),
  );
  const [note, setNote] = useState(promo?.note ?? "");
  const [active, setActive] = useState(promo?.active ?? true);
  // Captured at mount so the future-expiry check stays pure across re-renders.
  const [openedAtMs] = useState(() => Date.now());

  function changeKind(next: AdminPromoKind) {
    setKind(next);
    setValueInput(""); // avoid reading a % value as CHF (or vice versa)
  }

  // Resolve model values from the intent-based controls.
  const value =
    kind === "free"
      ? 0
      : kind === "fixed"
        ? Math.round(Number(valueInput) * 100)
        : Math.round(Number(valueInput));
  const maxRedemptions =
    usage === "unlimited"
      ? null
      : usage === "one_time"
        ? 1
        : Math.round(Number(limitInput));
  const expiresIso = expiryMode === "at" ? localInputToIso(expiresInput) : null;

  // Validation (mirrors the server; the UI just guides).
  const codeValid = code.trim().length > 0;
  const percentFootgun = kind === "percent" && value === 100;
  const valueValid =
    kind === "free" ||
    (kind === "percent"
      ? Number.isInteger(value) && value >= 1 && value <= 99
      : Number.isFinite(value) && value >= 1);
  const limitValid =
    usage !== "limited" ||
    (Number.isInteger(maxRedemptions) && (maxRedemptions ?? 0) >= 2);
  const expiryValid =
    expiryMode === "none" ||
    (expiresIso !== null && new Date(expiresIso).getTime() > openedAtMs);
  const belowUsage =
    isEdit && maxRedemptions !== null && maxRedemptions < promo.redeemedCount;
  const canSubmit =
    codeValid && valueValid && limitValid && expiryValid && !belowUsage && !pending;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      code: code.trim().toUpperCase(),
      kind,
      value: kind === "free" ? 0 : value,
      maxRedemptions,
      expiresAt: expiresIso,
      note: note.trim() === "" ? null : note.trim(),
      active,
    });
  }

  return (
    <div className="app-panel max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-6 text-left shadow-prominent-warm dark:shadow-prominent">
      <DialogTitle className="text-lg font-semibold tracking-tight text-[var(--app-fg)]">
        {isEdit ? "Edit promo code" : "New promo code"}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Create or edit a discount code: choose the discount, how often it can be used, and
        an optional expiry.
      </DialogDescription>

      <div className="mt-4 flex flex-col gap-4">
        <label className={fieldClass}>
          Code
          <Input
            value={code}
            disabled={codeLocked}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SAVE20"
          />
          <span className={helpClass}>
            {codeLocked
              ? "Locked — this code has been redeemed."
              : "Stored in uppercase."}
          </span>
        </label>

        {/* What discount */}
        <label className={fieldClass}>
          Discount
          <Select value={kind} onValueChange={(v) => changeKind(v as AdminPromoKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentage off</SelectItem>
              <SelectItem value="fixed">Fixed amount off</SelectItem>
              <SelectItem value="free">Free order</SelectItem>
            </SelectContent>
          </Select>
        </label>

        {kind !== "free" ? (
          <label className={fieldClass}>
            {kind === "percent" ? "Discount (%)" : "Discount amount (CHF)"}
            <Input
              type="number"
              min={kind === "percent" ? 1 : 0}
              max={kind === "percent" ? 99 : undefined}
              step={kind === "fixed" ? "0.05" : "1"}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder={kind === "percent" ? "20" : "10.00"}
            />
            {percentFootgun ? (
              <span className="text-[11px] text-destructive">
                For a fully free order, choose “Free order”.
              </span>
            ) : null}
          </label>
        ) : null}

        {/* How often */}
        <label className={fieldClass}>
          Usage
          <Select value={usage} onValueChange={(v) => setUsage(v as Usage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">One-time (single use)</SelectItem>
              <SelectItem value="unlimited">Unlimited</SelectItem>
              <SelectItem value="limited">Limited to…</SelectItem>
            </SelectContent>
          </Select>
        </label>

        {usage === "limited" ? (
          <label className={fieldClass}>
            Redemption limit
            <Input
              type="number"
              min={2}
              step="1"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="e.g. 100"
            />
            <span className={helpClass}>
              Maximum successful redemptions. Use “One-time” for a single use.
            </span>
          </label>
        ) : null}

        {/* Until when */}
        <label className={fieldClass}>
          Expiry
          <Select
            value={expiryMode}
            onValueChange={(v) => setExpiryMode(v as "none" | "at")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No expiry</SelectItem>
              <SelectItem value="at">Expires at…</SelectItem>
            </SelectContent>
          </Select>
        </label>

        {expiryMode === "at" ? (
          <label className={fieldClass}>
            Expiry date and time
            <Input
              type="datetime-local"
              value={expiresInput}
              onChange={(e) => setExpiresInput(e.target.value)}
            />
            <span className={helpClass}>Uses your local time.</span>
            {!expiryValid ? (
              <span className="text-[11px] text-destructive">
                Choose a future date and time.
              </span>
            ) : null}
          </label>
        ) : null}

        <label className={fieldClass}>
          Internal note (optional)
          <Input
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why or for whom this code was created"
          />
        </label>

        {!isEdit ? (
          <label className="flex items-center justify-between text-[13px] text-[var(--app-fg)]">
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
