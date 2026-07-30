import { describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  isEnvLoaded: () => false,
  env: () => ({
    EPOST_API_BASE_URL: "https://api.epost.ch",
    EPOST_API_KEY: "test-api-key",
    EPOST_TIMEOUT_MS: 5_000,
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
    EPOST_SUBMISSION_MODE: "live",
  }),
}));

import { EpostDispatchAdapter } from "../src/modules/dispatch/adapters/epost.adapter.js";
import type { EpostHttpClientLike } from "../src/modules/dispatch/adapters/epost-types.js";

describe("EpostDispatchAdapter status reconciliation", () => {
  it("looks up a delivery using the exact draft and snapshot identifiers", async () => {
    const httpClient = {
      requestJson: vi.fn().mockResolvedValue([
        {
          deliveryId: 8,
          detail: {
            documentMetadata: {
              senderCaseId: "draft-1",
              senderEndToEndId: "snapshot-1",
            },
          },
        },
      ]),
      createPricingPreview: vi.fn(),
    } satisfies EpostHttpClientLike;

    const adapter = new EpostDispatchAdapter({ httpClient });

    await expect(
      adapter.findDeliveryByApplicationIdentifiers("draft-1", "snapshot-1"),
    ).resolves.toEqual({
      providerReference: "8",
      matchedBy: "senderCaseId+senderEndToEndId",
    });
    expect(httpClient.requestJson).toHaveBeenCalledWith(
      "/epost/deliveries/monitoring",
      { method: "GET" },
      "delivery monitoring",
    );
  });

  it("normalizes the nested provider error code during status lookup", async () => {
    const httpClient = {
      requestJson: vi.fn().mockResolvedValue({
        deliveryId: "8",
        status: "ERROR",
        document: {
          failedDocument: [
            {
              detail: [
                {
                  deliveryChannel: "PHYSICAL",
                  errorCode: "PHYSICAL_DELIVERY_FAILED",
                  errorMessage: "Could not deliver physically, internal server error",
                },
              ],
            },
          ],
        },
      }),
      createPricingPreview: vi.fn(),
    } satisfies EpostHttpClientLike;
    const adapter = new EpostDispatchAdapter({ httpClient });

    await expect(adapter.checkStatus("8")).resolves.toMatchObject({
      state: "rejected",
      providerReference: "8",
      providerErrorCode: "PHYSICAL_DELIVERY_FAILED",
      failureReason: "Could not deliver physically, internal server error",
    });
  });
});
