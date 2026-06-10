"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, PenLine, Type } from "lucide-react";
import type { PublicSignatureChoice } from "@/lib/signature-choice";

interface SignatureChoicePickerProps {
  selectedChoice: PublicSignatureChoice | null;
  onChoiceChange: (choice: PublicSignatureChoice) => void;
  isCompactViewport?: boolean;
  children: ReactNode;
}

export function SignatureChoicePicker({
  selectedChoice,
  onChoiceChange,
  isCompactViewport = false,
  children,
}: SignatureChoicePickerProps) {
  const t = useTranslations("signatureTiers");

  const choices: Array<{
    choice: PublicSignatureChoice;
    icon: typeof Type;
  }> = [
    { choice: "drawn", icon: PenLine },
    { choice: "typed", icon: Type },
  ];
  const resolvedChoice = selectedChoice ?? "drawn";

  return (
    <div className="space-y-5">
      <div
        className={`grid gap-3 ${
          isCompactViewport ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {choices.map((choice) => (
          <TierCard
            key={choice.choice}
            icon={choice.icon}
            label={t(`${choice.choice}.label`)}
            purpose={t(`${choice.choice}.purpose`)}
            price={t(`${choice.choice}.price`)}
            priceDetail={t(`${choice.choice}.priceDetail`)}
            friction={t(`${choice.choice}.friction`)}
            selected={resolvedChoice === choice.choice}
            onSelect={() => onChoiceChange(choice.choice)}
          />
        ))}
      </div>

      <div className="pt-1">{children}</div>
    </div>
  );
}

interface TierCardProps {
  icon: typeof Type;
  label: string;
  purpose: string;
  price: string;
  priceDetail: string;
  friction: string;
  selected: boolean;
  onSelect: () => void;
}

function TierCard({
  icon: Icon,
  label,
  purpose,
  price,
  priceDetail,
  friction,
  selected,
  onSelect,
}: TierCardProps) {
  const baseClasses =
    "relative flex h-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all";
  const selectedClasses =
    "border-amber-300 bg-amber-50/60 shadow-sm shadow-amber-200/40 dark:border-amber-400/40 dark:bg-amber-400/10 dark:shadow-none";
  const unselectedClasses =
    "border-[var(--app-border)] bg-[var(--app-surface)] hover:border-zinc-300 hover:bg-[var(--app-surface-strong)] dark:hover:border-zinc-600";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses}`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          selected
            ? "bg-amber-100/70 text-amber-900 dark:bg-amber-400/22 dark:text-amber-100"
            : "bg-[var(--app-surface-soft)] text-zinc-400 dark:text-zinc-500"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {label}
          </div>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-300">
          {purpose}
        </p>
        <div className="mt-2 space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="font-medium text-zinc-700 dark:text-zinc-200">{price}</div>
          {priceDetail ? (
            <div className="text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
              {priceDetail}
            </div>
          ) : null}
          <div className="leading-tight">{friction}</div>
        </div>
      </div>

      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected
            ? "border-emerald-400 bg-emerald-400"
            : "border-zinc-300 bg-transparent dark:border-zinc-600"
        }`}
      >
        {selected ? <Check className="h-3 w-3 text-white" /> : null}
      </div>
    </button>
  );
}
