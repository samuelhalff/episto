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
