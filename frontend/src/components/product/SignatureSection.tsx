"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { CANVAS_HEIGHT, SignatureCanvas } from "./SignatureCanvas";
import type { SignatureMode } from "@/lib/signature-choice";

interface SignatureSectionProps {
  signerName: string;
  currentMode: SignatureMode;
  hasDrawnAsset: boolean;
  signatureUrl: string | null;
  isUploading: boolean;
  onDrawnSignature: (blob: Blob) => void;
  onClearDrawn: () => void;
}

export function SignatureSection({
  signerName,
  currentMode,
  hasDrawnAsset,
  signatureUrl,
  isUploading,
  onDrawnSignature,
  onClearDrawn,
}: SignatureSectionProps) {
  const t = useTranslations("draft");
  const [redrawingFromUrl, setRedrawingFromUrl] = useState<string | null>(null);
  const [hasActiveCanvasSession, setHasActiveCanvasSession] = useState(false);

  const handleRedraw = useCallback(() => {
    setRedrawingFromUrl(signatureUrl);
    setHasActiveCanvasSession(true);
  }, [signatureUrl]);

  const handleDrawnSignatureInternal = useCallback(
    (blob: Blob) => {
      setHasActiveCanvasSession(true);
      onDrawnSignature(blob);
    },
    [onDrawnSignature],
  );

  const handleClearDrawnInternal = useCallback(() => {
    setHasActiveCanvasSession(false);
    onClearDrawn();
  }, [onClearDrawn]);

  const showSavedSignature =
    hasDrawnAsset &&
    Boolean(signatureUrl) &&
    !isUploading &&
    !hasActiveCanvasSession &&
    redrawingFromUrl !== signatureUrl;

  return (
    <div className="space-y-4">
      {currentMode === "typed" ? (
        <div className="rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,249,240,0.92)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:bg-[linear-gradient(180deg,rgba(21,28,37,0.96)_0%,rgba(16,22,31,0.92)_100%)]">
          <p className="signature-script text-zinc-700 dark:text-zinc-100">
            {signerName || t("signatureFallbackName")}
          </p>
          <p className="signature-name mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {signerName || t("signatureFallbackName")}
          </p>
        </div>
      ) : null}

      {currentMode === "drawn" ? (
        <div className="space-y-3">
          {showSavedSignature ? (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--app-border)] bg-white">
              <div
                className="flex items-center justify-center px-4 py-3 select-none [-webkit-tap-highlight-color:transparent]"
                style={{ height: CANVAS_HEIGHT }}
              >
                <img
                  src={signatureUrl ?? undefined}
                  alt={t("signatureImageAlt")}
                  draggable={false}
                  className="pointer-events-none h-[120px] w-auto max-w-full select-none object-contain [-webkit-touch-callout:none]"
                />
              </div>
              <div className="flex items-center justify-between border-t border-[var(--app-border)] px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  {t("signatureSaved")}
                </div>
                <button
                  type="button"
                  onClick={handleRedraw}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("signatureRedraw")}
                </button>
              </div>
            </div>
          ) : (
            <SignatureCanvas
              onSignature={handleDrawnSignatureInternal}
              onClear={handleClearDrawnInternal}
              disabled={isUploading}
            />
          )}
          {isUploading ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("signatureUploading")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
