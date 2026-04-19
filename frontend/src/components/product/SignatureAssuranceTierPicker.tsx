"use client";

import { type ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, Info, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { SignatureAssuranceLevel } from "@swiss-mail/shared";
import type { SignatureAssuranceLevelValue } from "@swiss-mail/shared";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SignatureAssuranceTierPickerProps {
  assuranceLevel: SignatureAssuranceLevelValue;
  onAssuranceChange: (level: SignatureAssuranceLevelValue) => void;
  isCompactViewport?: boolean;
  children: ReactNode;
}

/**
 * Three-tier signature assurance picker.
 *
 * Phase 0: only the `visual` tier is selectable. `advanced` and `qualified`
 * render as `Coming soon` cards that still explain their purpose and price.
 * See docs/04-product/qualified-signatures.md.
 */
export function SignatureAssuranceTierPicker({
  assuranceLevel,
  onAssuranceChange,
  isCompactViewport = false,
  children,
}: SignatureAssuranceTierPickerProps) {
  const t = useTranslations("signatureTiers");

  const tiers: Array<{
    level: SignatureAssuranceLevelValue;
    icon: typeof PenLine;
    available: boolean;
  }> = [
    { level: SignatureAssuranceLevel.visual, icon: PenLine, available: true },
    { level: SignatureAssuranceLevel.advanced, icon: Sparkles, available: false },
    { level: SignatureAssuranceLevel.qualified, icon: ShieldCheck, available: false },
  ];

  return (
    <div className="space-y-5">
      <div
        className={`grid gap-3 ${
          isCompactViewport ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
        }`}
      >
        {tiers.map((tier) => (
          <TierCard
            key={tier.level}
            tier={tier.level}
            icon={tier.icon}
            label={t(`${tier.level}.label`)}
            purpose={t(`${tier.level}.purpose`)}
            price={t(`${tier.level}.price`)}
            friction={t(`${tier.level}.friction`)}
            selected={assuranceLevel === tier.level}
            available={tier.available}
            comingSoonLabel={t("comingSoon")}
            onSelect={() => {
              if (tier.available) onAssuranceChange(tier.level);
            }}
          />
        ))}
      </div>

      <ExplainerLink />

      {assuranceLevel === SignatureAssuranceLevel.visual ? (
        <div className="pt-1">{children}</div>
      ) : null}
    </div>
  );
}

interface TierCardProps {
  tier: SignatureAssuranceLevelValue;
  icon: typeof PenLine;
  label: string;
  purpose: string;
  price: string;
  friction: string;
  selected: boolean;
  available: boolean;
  comingSoonLabel: string;
  onSelect: () => void;
}

function TierCard({
  icon: Icon,
  label,
  purpose,
  price,
  friction,
  selected,
  available,
  comingSoonLabel,
  onSelect,
}: TierCardProps) {
  const baseClasses =
    "relative flex h-full flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition-all";
  const selectedClasses =
    "border-amber-300 bg-amber-50/60 shadow-sm shadow-amber-200/40 dark:border-amber-400/40 dark:bg-amber-400/10 dark:shadow-none";
  const unselectedClasses =
    "border-[var(--app-border)] bg-[var(--app-surface)] hover:border-zinc-300 hover:bg-[var(--app-surface-strong)] dark:hover:border-zinc-600";
  const unavailableClasses =
    "border-[var(--app-border)] bg-[var(--app-surface)] opacity-80";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!available}
      aria-pressed={selected}
      className={`${baseClasses} ${
        !available ? unavailableClasses : selected ? selectedClasses : unselectedClasses
      } disabled:cursor-not-allowed`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            selected
              ? "bg-amber-100/70 text-amber-900 dark:bg-amber-400/22 dark:text-amber-100"
              : "bg-[var(--app-surface-soft)] text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!available ? (
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {comingSoonLabel}
          </span>
        ) : (
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
              selected
                ? "border-emerald-400 bg-emerald-400"
                : "border-zinc-300 bg-transparent dark:border-zinc-600"
            }`}
          >
            {selected ? <Check className="h-3 w-3 text-white" /> : null}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {label}
        </div>
        <p className="text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-300">
          {purpose}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">{price}</span>
        <span className="text-right leading-tight">{friction}</span>
      </div>
    </button>
  );
}

function ExplainerLink() {
  const t = useTranslations("signatureTiers.explainer");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          <Info className="h-3.5 w-3.5" />
          {t("triggerLabel")}
        </button>
      </DialogTrigger>
      <DialogContent
        aria-describedby="signature-explainer-description"
        className="flex items-end justify-center sm:items-center"
      >
        <div className="w-full max-w-lg rounded-t-3xl bg-[var(--app-surface)] p-6 shadow-xl sm:rounded-3xl">
          <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {t("title")}
          </DialogTitle>
          <DialogDescription
            id="signature-explainer-description"
            className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300"
          >
            {t("intro")}
          </DialogDescription>

          <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-200">
            <li className="flex gap-2">
              <span className="text-zinc-400">•</span>
              <span>{t("caseStandard")}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-400">•</span>
              <span>{t("caseAdvanced")}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-400">•</span>
              <span>{t("caseQualified")}</span>
            </li>
          </ul>

          <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3 text-[12px] leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-100">
            {t("paperCaveat")}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <Link
              href="/signature-requirements"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200"
              onClick={() => setOpen(false)}
            >
              {t("fullRequirementsCta")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <DialogClose
              className="rounded-full bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              aria-label={t("close")}
            >
              {t("close")}
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
