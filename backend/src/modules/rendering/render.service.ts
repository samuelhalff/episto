/**
 * PDF rendering pipeline.
 *
 * Uses Puppeteer to convert HTML letter content to PDF.
 * This module is a shell — actual HTML template and rendering
 * will be implemented as part of the rendering build pack.
 *
 * The pipeline:
 * 1. Load snapshot data (letter content, addresses, metadata)
 * 2. Render HTML from template + snapshot
 * 3. Generate PDF via Puppeteer
 * 4. Upload to object storage
 * 5. Create file_asset record
 * 6. Link PDF to snapshot
 */

export interface RenderResult {
  pdfAssetId: string;
  storageKey: string;
  sizeBytes: number;
  pageCount: number;
}

/**
 * Render a draft snapshot to PDF.
 * TODO: Implement when HTML letter templates are built.
 */
export async function renderSnapshotToPdf(
  _snapshotId: string,
): Promise<RenderResult> {
  // This is intentionally not implemented yet.
  // The rendering pipeline requires:
  // 1. HTML letter templates (Swiss formal letter format)
  // 2. Puppeteer setup with proper page size (A4)
  // 3. Object storage upload
  // 4. File asset record creation
  throw new Error(
    "PDF rendering not yet implemented. Requires HTML templates and Puppeteer pipeline.",
  );
}
