"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import SignaturePad from "react-signature-canvas";
import { useTranslations } from "next-intl";
import { Eraser } from "lucide-react";

interface SignatureCanvasProps {
  onSignature: (blob: Blob) => void;
  onClear: () => void;
  disabled?: boolean;
}

const MIN_CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 160;
const DPR_CLAMP = 2;
const EXPORT_BG = "#ffffff";
/** Wait this long after the last stroke before exporting (ms). */
const STROKE_DEBOUNCE_MS = 800;

export function SignatureCanvas({
  onSignature,
  onClear,
  disabled = false,
}: SignatureCanvasProps) {
  const t = useTranslations("draft");
  const containerRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<SignaturePad>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const resizeCanvas = useCallback(() => {
    const pad = padRef.current;
    const container = containerRef.current;
    if (!pad || !container) return;

    const canvas = pad.getCanvas();
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, MIN_CANVAS_WIDTH);
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CLAMP);

    canvas.width = width * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    pad.clear();
  }, []);

  useEffect(() => {
    resizeCanvas();

    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function exportSignature() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;

    const trimmed = pad.getTrimmedCanvas();
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = trimmed.width;
    exportCanvas.height = trimmed.height;
    const ctx = exportCanvas.getContext("2d")!;
    ctx.fillStyle = EXPORT_BG;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(trimmed, 0, 0);

    exportCanvas.toBlob(
      (blob) => {
        if (blob) onSignature(blob);
      },
      "image/png",
      1,
    );
  }

  function handleEnd() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setIsEmpty(true);
      return;
    }
    setIsEmpty(false);

    // Debounce: wait for user to finish all strokes before uploading
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(exportSignature, STROKE_DEBOUNCE_MS);
  }

  function handleClear() {
    padRef.current?.clear();
    setIsEmpty(true);
    onClear();
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-2xl border bg-white ${
          disabled
            ? "pointer-events-none opacity-50"
            : "border-[var(--app-border)]"
        }`}
        style={{ height: CANVAS_HEIGHT }}
      >
        {/* @ts-expect-error react-signature-canvas class component vs React 19 JSX types */}
        <SignaturePad
          ref={padRef}
          penColor="#1a1a1a"
          minWidth={1.2}
          maxWidth={2.8}
          velocityFilterWeight={0.6}
          onEnd={handleEnd}
          canvasProps={{
            className: "absolute inset-0",
          }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-zinc-400 dark:text-zinc-500">
              {t("signatureDrawHint")}
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Eraser className="h-3.5 w-3.5" />
          {t("signatureClear")}
        </button>
      </div>
    </div>
  );
}
