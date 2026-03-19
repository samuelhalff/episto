"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PenLine, Image as ImageIcon, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api.js";
import type { FileAsset } from "@swiss-mail/shared";

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

export function SignaturePicker({
  mode,
  onModeChange,
  draftId,
  disabled,
}: {
  mode: string | null;
  onModeChange: (mode: string) => void;
  draftId: string;
  disabled?: boolean;
}) {
  const t = useTranslations("signature");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "signature");
      return apiFetch<FileAsset>(`/v1/drafts/${draftId}/files`, {
        method: "POST",
        body: formData,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["drafts", draftId, "files"],
      });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t("invalidType"));
      return;
    }

    if (file.size > MAX_SIGNATURE_SIZE) {
      setError(t("tooLarge"));
      return;
    }

    upload.mutate(file);
  }

  const options = [
    { key: "typed", icon: PenLine, label: t("typedLabel"), hint: t("typedHint") },
    { key: "image", icon: ImageIcon, label: t("imageLabel"), hint: t("imageHint") },
  ] as const;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">{t("title")}</h3>

      <div className="space-y-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(opt.key)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                mode === opt.key
                  ? "border-navy bg-navy/5 text-navy"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  mode === opt.key ? "border-navy" : "border-gray-300"
                }`}
              >
                {mode === opt.key && (
                  <span className="h-2 w-2 rounded-full bg-navy" />
                )}
              </span>
              <Icon className="h-4 w-4" />
              <span className="flex flex-col items-start">
                <span className="font-medium">{opt.label}</span>
                <span className="text-xs text-gray-400">{opt.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {mode === "image" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || upload.isPending}
          />
          <button
            type="button"
            disabled={disabled || upload.isPending}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-700 disabled:opacity-40"
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            {upload.isPending ? t("uploading") : t("imageLabel")}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
