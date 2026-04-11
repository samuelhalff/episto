export type JsonRecord = Record<string, unknown>;

export interface EpostPricingPreviewResult {
  previewId: string;
  preview: JsonRecord;
}

export interface EpostHttpClientLike {
  requestJson(
    path: string,
    init: RequestInit,
    operation: string,
  ): Promise<unknown>;
  createPricingPreview(request: FormData): Promise<EpostPricingPreviewResult>;
}
