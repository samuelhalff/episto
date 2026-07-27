import createClient, {
  getLongRunningPoller,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";

import { env } from "../../shared/config/index.js";

/** Whether Azure Document Intelligence (Read/OCR) is configured for scans/photos. */
export function isOcrConfigured(): boolean {
  const c = env();
  return Boolean(
    c.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT && c.AZURE_DOCUMENT_INTELLIGENCE_KEY,
  );
}

/**
 * OCR a document (scanned PDF or photo) with the prebuilt-read model and return
 * its plain-text content. Page-range capped so billing is bounded per document.
 * Throws when OCR is not configured or the service errors — the caller records
 * that as a "failed"/"no_ocr" status and tells the user.
 */
export async function ocrExtractText(buffer: Buffer, maxPages: number): Promise<string> {
  const c = env();
  const endpoint = c.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = c.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  if (!endpoint || !key) {
    throw new Error("Document Intelligence not configured");
  }

  const client = createClient(endpoint, new AzureKeyCredential(key));
  const initial = await client
    .path("/documentModels/{modelId}:analyze", "prebuilt-read")
    .post({
      contentType: "application/json",
      body: { base64Source: buffer.toString("base64") },
      // Only bill/analyze the first N pages.
      queryParameters: { pages: `1-${maxPages}` },
    });

  if (isUnexpected(initial)) {
    throw new Error(
      `Document Intelligence analyze failed (${initial.status}): ${
        initial.body?.error?.message ?? "unknown"
      }`,
    );
  }

  const poller = getLongRunningPoller(client, initial);
  const done = await poller.pollUntilDone();
  const body = done.body as { analyzeResult?: { content?: string } };
  return body.analyzeResult?.content ?? "";
}
