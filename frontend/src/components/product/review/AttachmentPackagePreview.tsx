"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import type { FileAsset } from "@episto/shared";
import { getAttachmentInlineUrl } from "@/lib/letter-content";

// Renders uploaded attachments as they will be mailed, directly under the
// letter, so the review preview reflects the complete physical package.
// Images render inline; PDFs are rasterised page-by-page with pdf.js and fall
// back to an "open file" link if rendering fails — so this never blocks review.

// Bound the work so a large/scanned PDF can't exhaust browser memory (mobile
// Safari has a hard canvas ceiling): render the first pages, link out for more.
const MAX_PREVIEW_PAGES = 6;
const TARGET_CANVAS_WIDTH = 900;

function AttachmentOpenLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 underline underline-offset-4 hover:no-underline dark:text-amber-300"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );
}

function ImageAttachment({ url, openLabel }: { url: string; openLabel: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <AttachmentOpenLink url={url} label={openLabel} />;
  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full rounded-sm border border-[var(--app-border)] bg-white shadow-sm"
    />
  );
}

function PdfAttachment({
  url,
  openLabel,
  morePagesLabel,
}: {
  url: string;
  openLabel: string;
  morePagesLabel: (extra: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [extraPages, setExtraPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    let loadingTask: PDFDocumentLoadingTask | undefined;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        loadingTask = pdfjs.getDocument({ url, withCredentials: true });
        const pdf = await loadingTask.promise;
        if (cancelled || !container) return;
        container.replaceChildren();

        const renderCount = Math.min(pdf.numPages, MAX_PREVIEW_PAGES);
        for (let pageNumber = 1; pageNumber <= renderCount; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(2, TARGET_CANVAS_WIDTH / base.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className =
            "w-full rounded-sm border border-[var(--app-border)] bg-white shadow-sm";
          if (pageNumber > 1) canvas.style.marginTop = "0.75rem";
          await page.render({ canvasContext: context, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
        if (cancelled) return;
        setExtraPages(pdf.numPages - renderCount);
        setStatus("ok");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [url]);

  if (status === "error") {
    return <AttachmentOpenLink url={url} label={openLabel} />;
  }

  return (
    <div>
      <div ref={containerRef} />
      {status === "loading" ? (
        <div className="h-40 w-full animate-pulse rounded-sm border border-[var(--app-border)] bg-[var(--app-surface)]" />
      ) : null}
      {extraPages > 0 ? (
        <p className="mt-2">
          <AttachmentOpenLink url={url} label={morePagesLabel(extraPages)} />
        </p>
      ) : null}
    </div>
  );
}

export function AttachmentPackagePreview({ attachments }: { attachments: FileAsset[] }) {
  const t = useTranslations("review");
  const items = attachments.filter(
    (file) => file.kind === "attachment" && file.status === "active",
  );

  if (items.length === 0) return null;

  return (
    <section
      id="mailed-attachments"
      className="app-panel-muted rounded-[2rem] p-4 sm:p-5"
      aria-label={t("attachments")}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {t("attachmentsPreviewTitle", { count: items.length })}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("attachmentsPreviewSubtitle")}
        </p>
      </div>

      <ol className="space-y-6">
        {items.map((file, index) => {
          const url = getAttachmentInlineUrl(file.id);
          const label = t("attachmentLabel", {
            index: index + 1,
            name: file.originalFilename ?? `#${index + 1}`,
          });
          return (
            <li key={file.id}>
              <p className="mb-2 text-xs font-medium tracking-normal text-zinc-500 dark:text-zinc-400">
                {label}
              </p>
              {file.mimeType.startsWith("image/") ? (
                <ImageAttachment url={url} openLabel={t("attachmentOpen")} />
              ) : file.mimeType === "application/pdf" ? (
                <PdfAttachment
                  url={url}
                  openLabel={t("attachmentOpen")}
                  morePagesLabel={(extra) => t("attachmentMorePages", { count: extra })}
                />
              ) : (
                <AttachmentOpenLink url={url} label={t("attachmentOpen")} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
