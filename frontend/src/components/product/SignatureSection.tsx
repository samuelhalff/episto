"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, PenLine, Type } from "lucide-react";
import { SignatureCanvas } from "./SignatureCanvas";

type SignatureMode = "typed" | "drawn" | null;

interface SignatureSectionProps {
  signerName: string;
  currentMode: SignatureMode;
  hasDrawnAsset: boolean;
  isUploading: boolean;
  onSelectMode: (mode: SignatureMode) => void;
  onDrawnSignature: (blob: Blob) => void;
  onClearDrawn: () => void;
  isCompactViewport?: boolean;
}

export function SignatureSection({
  signerName,
  currentMode,
  hasDrawnAsset,
  isUploading,
  onSelectMode,
  onDrawnSignature,
  onClearDrawn,
  isCompactViewport,
}: SignatureSectionProps) {
  const t = useTranslations("draft");
  const [localMode, setLocalMode] = useState<SignatureMode>(currentMode);

  const handleModeSelect = useCallback(
    (mode: SignatureMode) => {
      setLocalMode(mode);
      onSelectMode(mode);
    },
    [onSelectMode],
  );

  const modeOptions = [
    {
      mode: "typed" as const,
      label: t("signatureTyped"),
      description: t("signatureTypedDesc"),
      icon: Type,
    },
    {
      mode: "drawn" as const,
      label: t("signatureDrawn"),
      description: t("signatureDrawnDesc"),
      icon: PenLine,
    },
  ];

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${isCompactViewport ? "grid-cols-1" : "grid-cols-2"}`}>
        {modeOptions.map((opt) => {
          const isSelected = localMode === opt.mode;
          const Icon = opt.icon;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => handleModeSelect(opt.mode)}
              className={`relative flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all ${
                isSelected
                  ? "border-amber-300 bg-amber-50/60 shadow-sm shadow-amber-200/40 dark:border-amber-400/40 dark:bg-amber-400/10 dark:shadow-none"
                  : "border-[var(--app-border)] bg-[var(--app-surface)] hover:border-zinc-300 hover:bg-[var(--app-surface-strong)] dark:hover:border-zinc-600"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  isSelected
                    ? "bg-amber-100/70 text-amber-900 dark:bg-amber-400/22 dark:text-amber-100"
                    : "bg-[var(--app-surface-soft)] text-zinc-400 dark:text-zinc-500"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {opt.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {opt.description}
                </div>
              </div>
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-400"
                    : "border-zinc-300 bg-transparent dark:border-zinc-600"
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {localMode === "typed" && (
        <div className="rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,249,240,0.92)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:bg-[linear-gradient(180deg,rgba(21,28,37,0.96)_0%,rgba(16,22,31,0.92)_100%)]">
          <p className="signature-script text-zinc-700 dark:text-zinc-100">
            {signerName || t("signatureFallbackName")}
          </p>
          <p className="signature-name mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {signerName || t("signatureFallbackName")}
          </p>
        </div>
      )}

      {localMode === "drawn" && (
        <div className="space-y-3">
          <SignatureCanvas
            onSignature={onDrawnSignature}
            onClear={onClearDrawn}
            disabled={isUploading}
          />
          {isUploading && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("signatureUploading")}
            </div>
          )}
          {hasDrawnAsset && !isUploading && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              {t("signatureSaved")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
