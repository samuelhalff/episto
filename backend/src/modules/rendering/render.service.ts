export type {
  PdfRenderMargins,
  RenderPdfBufferResult,
  RenderResult,
} from "./render.types.js";
export { closeBrowser, countPdfPages, renderPdfBufferFromHtml } from "./render-pdf.js";
export type { RenderLetterHtmlOptions } from "./render-template.js";
export { renderLetterHtml } from "./render-template.js";
export { renderSnapshotToPdf } from "./render-snapshot-pipeline.js";
