"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import SignaturePad from "signature_pad";
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
const PAD_OPTIONS = {
  penColor: "#1a1a1a",
  minWidth: 1.2,
  maxWidth: 2.8,
  velocityFilterWeight: 0.6,
};

function trimCanvasToInk(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const context = sourceCanvas.getContext("2d");
  if (!context) {
    return sourceCanvas;
  }

  const { width, height } = sourceCanvas;
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) {
        continue;
      }

      hasInk = true;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!hasInk) {
    return sourceCanvas;
  }

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = maxX - minX + 1;
  trimmedCanvas.height = maxY - minY + 1;
  const trimmedContext = trimmedCanvas.getContext("2d");
  if (!trimmedContext) {
    return sourceCanvas;
  }

  trimmedContext.putImageData(
    context.getImageData(minX, minY, trimmedCanvas.width, trimmedCanvas.height),
    0,
    0,
  );

  return trimmedCanvas;
}

export function SignatureCanvas({
  onSignature,
  onClear,
  disabled = false,
}: SignatureCanvasProps) {
  const t = useTranslations("draft");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const exportSignature = useCallback(() => {
    const pad = padRef.current;
    const canvas = canvasRef.current;
    if (!pad || !canvas || pad.isEmpty()) {
      return;
    }

    const trimmed = trimCanvasToInk(canvas);
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = trimmed.width;
    exportCanvas.height = trimmed.height;
    const context = exportCanvas.getContext("2d");
    if (!context) {
      return;
    }

    context.fillStyle = EXPORT_BG;
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    context.drawImage(trimmed, 0, 0);
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          onSignature(blob);
        }
      },
      "image/png",
      1,
    );
  }, [onSignature]);

  const handleEnd = useCallback(() => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setIsEmpty(true);
      return;
    }

    setIsEmpty(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(exportSignature, STROKE_DEBOUNCE_MS);
  }, [exportSignature]);

  const resizeCanvas = useCallback(() => {
    const pad = padRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pad || !canvas || !container) {
      return;
    }

    const strokeData = pad.isEmpty() ? null : pad.toData();
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, MIN_CANVAS_WIDTH);
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CLAMP);

    canvas.width = width * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.scale(dpr, dpr);
    pad.clear();

    if (!strokeData) {
      return;
    }

    pad.fromData(strokeData);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const pad = new SignaturePad(canvas, {
      ...PAD_OPTIONS,
      onEnd: handleEnd,
    });
    padRef.current = pad;

    return () => {
      pad.off();
      padRef.current = null;
    };
  }, [handleEnd]);

  useEffect(() => {
    resizeCanvas();

    const observer = new ResizeObserver(() => resizeCanvas());
    const container = containerRef.current;
    if (container) {
      observer.observe(container);
    }

    return () => observer.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pad = padRef.current;
    if (!pad) {
      return;
    }

    if (disabled) {
      pad.off();
      return;
    }

    pad.on();
  }, [disabled]);

  function handleClear() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
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
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
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
