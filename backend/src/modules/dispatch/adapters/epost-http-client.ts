import { AppError, providerOutageError } from "../../../shared/errors/index.js";
import { env } from "../../../shared/config/index.js";
import { mapHttpError } from "./epost-error-mapping.js";
import { extractErrorMessage } from "./epost-response-mappers.js";
import type {
  EpostHttpClientLike,
  EpostPricingPreviewResult,
  JsonRecord,
} from "./epost-types.js";

const DEFAULT_POLL_INTERVAL_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface EpostHttpClientOptions {
  baseUrl?: string;
  apiKey?: string | null | undefined;
  timeoutMs?: number;
}

export class EpostHttpClient implements EpostHttpClientLike {
  private readonly baseUrl: string;
  private readonly apiKey: string | null;
  private readonly timeoutMs: number;

  constructor(options: EpostHttpClientOptions = {}) {
    const config = env();
    this.baseUrl = (options.baseUrl ?? config.EPOST_API_BASE_URL).replace(/\/$/, "");
    this.apiKey = options.apiKey ?? config.EPOST_API_KEY ?? null;
    this.timeoutMs = options.timeoutMs ?? config.EPOST_TIMEOUT_MS;
  }

  private getHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "EPOST_API_KEY_MISSING",
        message: "EPOST_API_KEY is not configured.",
        userMessage: "Live postal pricing is unavailable in this environment.",
        userAction: "Configure the provider API key and retry.",
      });
    }

    return {
      "X-API-KEY": this.apiKey,
      Accept: "application/json",
    };
  }

  async requestJson(
    path: string,
    init: RequestInit,
    operation: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          ...this.getHeaders(),
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });

      const rawText = await response.text();
      const payload = rawText ? JSON.parse(rawText) : null;

      if (!response.ok) {
        throw mapHttpError(operation, response.status, payload);
      }

      return payload;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw providerOutageError("ePost", error);
      }

      throw providerOutageError("ePost", error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async pollPreviewResult(previewId: string): Promise<JsonRecord> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() <= deadline) {
      const response = (await this.requestJson(
        `/epost/preview/delivery-prices/${previewId}/status`,
        { method: "GET" },
        "preview pricing status",
      )) as JsonRecord;

      const status = response.status;
      if (status === "FINISHED") {
        return response;
      }

      if (status === "ERROR") {
        throw new AppError({
          family: "dispatch_rejection",
          statusCode: 422,
          code: "EPOST_PREVIEW_FAILED",
          message:
            extractErrorMessage(response) ??
            `ePost delivery pricing preview ${previewId} ended in ERROR.`,
          userMessage: "The postal provider could not quote this delivery.",
          userAction: "Check the letter details and try again.",
        });
      }

      await sleep(DEFAULT_POLL_INTERVAL_MS);
    }

    throw new AppError({
      family: "dispatch_ambiguity",
      statusCode: 502,
      code: "EPOST_PREVIEW_TIMEOUT",
      message: `Timed out while waiting for ePost preview ${previewId}.`,
      userMessage: "The postal provider did not finish pricing in time.",
      userAction: "Please retry in a moment.",
    });
  }

  async createPricingPreview(request: FormData): Promise<EpostPricingPreviewResult> {
    const created = (await this.requestJson(
      "/epost/preview/delivery-prices",
      {
        method: "POST",
        body: request,
      },
      "preview pricing",
    )) as JsonRecord;

    const previewId = typeof created.id === "string" ? created.id : null;
    if (!previewId) {
      throw new AppError({
        family: "dispatch_ambiguity",
        statusCode: 502,
        code: "EPOST_PREVIEW_ID_MISSING",
        message: "ePost preview creation did not return an id.",
        userMessage: "The postal provider did not return a usable quote.",
        userAction: "Please retry in a moment.",
      });
    }

    return {
      previewId,
      preview: await this.pollPreviewResult(previewId),
    };
  }
}
