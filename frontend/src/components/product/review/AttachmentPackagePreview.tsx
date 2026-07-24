"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { FileAsset } from "@episto/shared";
import { getAttachmentInlineUrl } from "@/lib/letter-content";

// Renders uploaded attachments as they will be mailed, directly under the
// letter, so the review preview reflects the complete physical package.
// Images render inline; PDFs are rasterised page-by-page with pdf.js and fall
// back to an "open file" link if rendering fails — so this never blocks review.

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

function PdfAttachment({ url, openLabel }: { url: string; openLabel: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjs.getDocument({ url, withCredentials: true }).promise;
        if (cancelled || !container) return;
        container.replaceChildren();

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.5 });
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
        if (!cancelled) setStatus("ok");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
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
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {label}
              </p>
              {file.mimeType.startsWith("image/") ? (
                <img
                  src={url}
                  alt=""
                  aria-hidden="true"
                  className="w-full rounded-sm border border-[var(--app-border)] bg-white shadow-sm"
                />
              ) : file.mimeType === "application/pdf" ? (
                <PdfAttachment url={url} openLabel={t("attachmentOpen")} />
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
