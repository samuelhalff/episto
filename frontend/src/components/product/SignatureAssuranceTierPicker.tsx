"use client";

import { type ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Check,
  ChevronRight,
  Info,
  PenLine,
  ShieldCheck,
  Type,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PublicSignatureChoice } from "@/lib/signature-choice";
import { QesWaitlistDialog } from "./QesWaitlistDialog";

interface SignatureAssuranceTierPickerProps {
  selectedChoice: PublicSignatureChoice | null;
  onChoiceChange: (choice: PublicSignatureChoice) => void;
  isQesAvailable?: boolean;
  isCompactViewport?: boolean;
  children: ReactNode;
}

/**
 * Public signature picker.
 *
 * The product exposes only typed, drawn, and QES. Internally those still map to
 * `visual + typed/drawn` or `qualified`.
 */
export function SignatureAssuranceTierPicker({
  selectedChoice,
  onChoiceChange,
  isQesAvailable = false,
  isCompactViewport = false,
  children,
}: SignatureAssuranceTierPickerProps) {
  const t = useTranslations("signatureTiers");
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const choices: Array<{
    choice: PublicSignatureChoice;
    icon: typeof Type;
    available: boolean;
    comingSoon: boolean;
  }> = [
    { choice: "typed", icon: Type, available: true, comingSoon: false },
    { choice: "drawn", icon: PenLine, available: true, comingSoon: false },
    {
      choice: "qualified",
      icon: ShieldCheck,
      available: isQesAvailable,
      comingSoon: !isQesAvailable,
    },
  ];

  return (
    <div className="space-y-5">
      <div
        className={`grid gap-3 ${
          isCompactViewport ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
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
            selected={selectedChoice === choice.choice}
            available={choice.available}
            comingSoon={choice.comingSoon}
            comingSoonLabel={t("comingSoon")}
            notifyLabel={
              choice.choice === "qualified" ? t("qualified.notifyLabel") : undefined
            }
            notifyHint={
              choice.choice === "qualified" ? t("qualified.notifyHint") : undefined
            }
            onSelect={() => {
              if (choice.comingSoon) {
                setWaitlistOpen(true);
                return;
              }
              if (choice.available) {
                onChoiceChange(choice.choice);
              }
            }}
          />
        ))}
      </div>

      <QesWaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} />

      <ExplainerLink />

      {selectedChoice === "qualified" ? (
        <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-5">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {t("qualified.label")}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {t("qualified.purpose")}
          </p>
        </div>
      ) : selectedChoice === "typed" || selectedChoice === "drawn" ? (
        <div className="pt-1">{children}</div>
      ) : null}
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
  available: boolean;
  comingSoon: boolean;
  comingSoonLabel: string;
  notifyLabel?: string | undefined;
  notifyHint?: string | undefined;
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
  available,
  comingSoon,
  comingSoonLabel,
  notifyLabel,
  notifyHint,
  onSelect,
}: TierCardProps) {
  const baseClasses =
    "relative flex h-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all";
  const selectedClasses =
    "border-amber-300 bg-amber-50/60 shadow-sm shadow-amber-200/40 dark:border-amber-400/40 dark:bg-amber-400/10 dark:shadow-none";
  const unselectedClasses =
    "border-[var(--app-border)] bg-[var(--app-surface)] hover:border-zinc-300 hover:bg-[var(--app-surface-strong)] dark:hover:border-zinc-600";
  const unavailableClasses = "border-[var(--app-border)] bg-[var(--app-surface)]";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!available && !comingSoon}
      aria-pressed={selected}
      data-qes-waitlist-card={comingSoon ? "true" : undefined}
      className={`${baseClasses} ${
        !available ? unavailableClasses : selected ? selectedClasses : unselectedClasses
      } disabled:cursor-not-allowed ${comingSoon ? "opacity-90 hover:border-amber-300 hover:bg-amber-50/40 dark:hover:border-amber-400/40 dark:hover:bg-amber-400/5 cursor-pointer" : ""}`}
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
          {comingSoon ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:bg-amber-400/20 dark:text-amber-100">
              {comingSoonLabel}
            </span>
          ) : null}
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
        {comingSoon && notifyLabel && notifyHint ? (
          <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-left dark:border-amber-400/20 dark:bg-amber-400/10">
            <div className="flex items-start gap-2">
              <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-200" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-100">
                  {notifyLabel}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-amber-900 dark:text-amber-100">
                  {notifyHint}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {comingSoon ? (
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200"
        >
          <Bell className="h-4 w-4" />
        </div>
      ) : (
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
            selected
              ? "border-emerald-400 bg-emerald-400"
              : "border-zinc-300 bg-transparent dark:border-zinc-600"
          }`}
        >
          {selected ? <Check className="h-3 w-3 text-white" /> : null}
        </div>
      )}
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
        <div className="w-full max-w-lg rounded-t-3xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-6 shadow-xl sm:rounded-3xl">
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
              <span>{t("caseTyped")}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-zinc-400">•</span>
              <span>{t("caseDrawn")}</span>
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
