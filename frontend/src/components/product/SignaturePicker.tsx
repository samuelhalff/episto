"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FileAsset } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignaturePickerProps {
  /** Typed full name from the sender profile (pre-filled) */
  signerName: string;
  /** Existing uploaded signature asset, if any */
  signatureAsset: FileAsset | null;
  isUploading: boolean;
  onUploadImage: (file: File) => Promise<void>;
  onRemoveImage: () => Promise<void>;
  /** Called when user selects the "typed" mode */
  onSelectTyped: () => void;
}

type SignatureMode = "typed" | "image";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SignaturePicker({
  signerName,
  signatureAsset,
  isUploading,
  onUploadImage,
  onRemoveImage,
  onSelectTyped,
}: SignaturePickerProps) {
  const t = useTranslations("signature");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SignatureMode>(signatureAsset ? "image" : "typed");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleImageFile = useCallback(
    async (file: File) => {
      const ALLOWED = new Set(["image/png", "image/jpeg"]);
      const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

      if (!ALLOWED.has(file.type)) {
        setValidationError(t("error.unsupportedType"));
        return;
      }
      if (file.size > MAX_BYTES) {
        setValidationError(t("error.tooLarge"));
        return;
      }

      setValidationError(null);
      await onUploadImage(file);
    },
    [onUploadImage, t],
  );

  const handleModeSwitch = (next: SignatureMode) => {
    setMode(next);
    setValidationError(null);
    if (next === "typed") {
      onSelectTyped();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{t("prompt")}</p>

      {/* Mode toggle */}
      <div className="flex gap-3">
        {(["typed", "image"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => handleModeSwitch(m)}
            className={[
              "flex-1 rounded-lg border px-4 py-3 text-left transition-colors",
              mode === m
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50",
            ].join(" ")}
          >
            {mode === m && (
              <Check className="mb-1 h-4 w-4 text-primary" aria-hidden />
            )}
            <span className="block text-sm font-medium">
              {t(`mode.${m}.label`)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t(`mode.${m}.description`)}
            </span>
          </button>
        ))}
      </div>

      {/* Typed preview */}
      {mode === "typed" && (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="mb-1 text-xs text-muted-foreground">{t("preview.label")}</p>
          <p
            className="text-lg italic"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {signerName || t("preview.placeholder")}
          </p>
        </div>
      )}

      {/* Image upload */}
      {mode === "image" && (
        <div className="space-y-3">
          {signatureAsset ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <img
                src={`/api/v1/drafts/files/${signatureAsset.id}`}
                alt={t("imageAlt")}
                className="h-12 max-w-[200px] object-contain"
              />
              <div className="flex-1" />
              <button
                type="button"
                className="text-xs text-muted-foreground underline hover:text-destructive"
                onClick={() => void onRemoveImage()}
              >
                {t("remove")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isUploading}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 transition-colors hover:border-primary hover:bg-muted/50 disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isUploading ? t("uploading") : t("uploadPrompt")}
              </span>
              <span className="text-xs text-muted-foreground/60">
                {t("uploadHint")}
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImageFile(file);
            }}
          />

          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}
        </div>
      )}
    </div>
  );
}
