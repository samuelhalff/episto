import puppeteer, { type Browser } from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { getPuppeteerLaunchOptions } from "./browser-launch.js";
import type { PdfRenderMargins, RenderPdfBufferResult } from "./render.types.js";

let browserInstance: Browser | undefined;

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.connected) return browserInstance;

  browserInstance = await puppeteer.launch(getPuppeteerLaunchOptions());
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = undefined;
  }
}

export async function countPdfPages(pdfBuffer: Buffer | Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(pdfBuffer);
  return pdf.getPageCount();
}

export async function renderPdfBufferFromHtml(
  html: string,
  options?: {
    margins?: PdfRenderMargins;
    /**
     * Chromium header template, drawn in the top margin band of every page.
     * It is the only mechanism that knows the page number, which is why the
     * letter's continuation header uses it — see letter-continuation.ts.
     */
    headerTemplate?: string;
  },
): Promise<RenderPdfBufferResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const margins = options?.margins ?? {
    top: "25mm",
    right: "25mm",
    bottom: "30mm",
    left: "25mm",
  };

  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      const browserGlobal = globalThis as {
        document?: { fonts?: { ready?: Promise<unknown> } };
      };
      await (browserGlobal.document?.fonts?.ready ?? Promise.resolve());
    });

    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        margin: margins,
        ...(options?.headerTemplate
          ? {
              displayHeaderFooter: true,
              headerTemplate: options.headerTemplate,
              // Chromium prints its own date/URL footer unless one is supplied.
              footerTemplate: "<span></span>",
            }
          : {}),
      }),
    );

    return {
      pdfBuffer,
      pageCount: await countPdfPages(pdfBuffer),
    };
  } finally {
    await page.close();
  }
}
