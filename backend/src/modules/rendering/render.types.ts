export interface RenderResult {
  pdfAssetId: string;
  storageKey: string;
  sizeBytes: number;
  pageCount: number;
}

export interface PdfRenderMargins {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface RenderPdfBufferResult {
  pdfBuffer: Buffer;
  pageCount: number;
}
