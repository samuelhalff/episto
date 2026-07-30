import { describe, expect, it } from "vitest";

import {
  findExactMonitoringDelivery,
  mapStatusLookup,
} from "../src/modules/dispatch/adapters/epost-response-mappers.js";

describe("mapStatusLookup", () => {
  it("extracts PHYSICAL_DELIVERY_FAILED from the ePost status detail", () => {
    expect(
      mapStatusLookup({
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
    ).toMatchObject({
      state: "rejected",
      providerErrorCode: "PHYSICAL_DELIVERY_FAILED",
      failureReason: "Could not deliver physically, internal server error",
    });
  });

  it("returns null providerErrorCode when no nested error detail exists", () => {
    expect(
      mapStatusLookup({
        status: "DELIVERED",
        document: {},
      }),
    ).toMatchObject({
      state: "accepted",
      providerErrorCode: null,
      failureReason: null,
    });
  });

  it("still maps the top-level status when called with a plain string (backwards compat)", () => {
    expect(mapStatusLookup("DELIVERED")).toMatchObject({
      state: "accepted",
      providerErrorCode: null,
      failureReason: null,
    });
    expect(mapStatusLookup("ERROR")).toMatchObject({
      state: "rejected",
      providerErrorCode: null,
      failureReason: null,
    });
    expect(mapStatusLookup("CREATED")).toMatchObject({
      state: "submitted",
      providerErrorCode: null,
      failureReason: null,
    });
  });
});

describe("findExactMonitoringDelivery", () => {
  it("matches monitoring only on both immutable application identifiers", () => {
    expect(
      findExactMonitoringDelivery(
        [
          {
            deliveryId: 8,
            detail: {
              documentMetadata: {
                senderCaseId: "draft-1",
                senderEndToEndId: "snapshot-1",
              },
            },
          },
        ],
        "draft-1",
        "snapshot-1",
      ),
    ).toEqual({
      providerReference: "8",
      matchedBy: "senderCaseId+senderEndToEndId",
    });

    expect(
      findExactMonitoringDelivery(
        [
          {
            deliveryId: 9,
            detail: {
              documentMetadata: {
                senderCaseId: "draft-1",
                senderEndToEndId: "other-snapshot",
              },
            },
          },
        ],
        "draft-1",
        "snapshot-1",
      ),
    ).toBeNull();
  });

  it("returns null for zero matches", () => {
    expect(findExactMonitoringDelivery([], "draft-1", "snapshot-1")).toBeNull();
  });

  it("returns null for multiple matches", () => {
    expect(
      findExactMonitoringDelivery(
        [
          {
            deliveryId: 1,
            detail: {
              documentMetadata: {
                senderCaseId: "draft-1",
                senderEndToEndId: "snapshot-1",
              },
            },
          },
          {
            deliveryId: 2,
            detail: {
              documentMetadata: {
                senderCaseId: "draft-1",
                senderEndToEndId: "snapshot-1",
              },
            },
          },
        ],
        "draft-1",
        "snapshot-1",
      ),
    ).toBeNull();
  });

  it("returns null when documentMetadata is missing", () => {
    expect(
      findExactMonitoringDelivery(
        [{ deliveryId: 5, detail: {} }],
        "draft-1",
        "snapshot-1",
      ),
    ).toBeNull();
  });

  it("returns null when deliveryId is not a number or string", () => {
    expect(
      findExactMonitoringDelivery(
        [
          {
            detail: {
              documentMetadata: {
                senderCaseId: "draft-1",
                senderEndToEndId: "snapshot-1",
              },
            },
          },
        ],
        "draft-1",
        "snapshot-1",
      ),
    ).toBeNull();
  });
});
