import { beforeEach, describe, expect, it, vi } from "vitest";

import * as addressSearchService from "../src/modules/drafting/address-search.service.js";

const { getRecipientCompanyDetails, searchRecipientCompanies } = addressSearchService;
const addressSearchExports = addressSearchService as typeof addressSearchService & {
  searchAddresses?: (query: string) => Promise<unknown>;
  getAddressDetails?: (id: string) => Promise<unknown>;
};

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    COMPANY_SEARCH_PROVIDER: "zefix",
    COMPANY_SEARCH_TIMEOUT_MS: 5000,
    ZEFIX_PROXY_BASE_URL: "http://zefix-proxy:8081",
    ADDRESS_SEARCH_PROVIDER: "google_places",
    ADDRESS_SEARCH_TIMEOUT_MS: 5000,
    GOOGLE_PLACES_API_BASE_URL: "https://places.googleapis.com",
    GOOGLE_PLACES_API_KEY: "test-google-places-key",
  }),
}));

describe("searchRecipientCompanies", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects too-short queries", async () => {
    await expect(searchRecipientCompanies("A")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("normalizes Zefix company results into the app contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [
        {
          name: "Swisscom AG",
          ehraid: 434694,
          uid: "CHE102753938",
          chid: "CH03580182127",
          legalSeat: "Ittigen",
          status: "ACTIVE",
        },
      ],
    } as Response);

    await expect(searchRecipientCompanies("Swisscom")).resolves.toEqual([
      {
        id: "zefix:434694",
        name: "Swisscom AG",
        registryUid: "CHE102753938",
        registryChid: "CH03580182127",
        registryId: "434694",
        registryStatus: "ACTIVE",
        legalSeat: "Ittigen",
        source: "zefix",
      },
    ]);
  });

  it("normalizes Zefix company details into canonical address fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Swisscom AG",
        address: {
          street: "Alte Tiefenaustrasse",
          houseNumber: "6",
          addon: null,
          poBox: null,
          city: "Ittigen",
          swissZipCode: "3050",
        },
      }),
    } as Response);

    await expect(getRecipientCompanyDetails("zefix:434694")).resolves.toEqual({
      id: "zefix:434694",
      name: "Swisscom AG",
      addressLine1: "Alte Tiefenaustrasse 6",
      postalCode: "3050",
      city: "Ittigen",
      source: "zefix",
    });
  });
});

describe("address autocomplete", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects too-short address queries", async () => {
    expect(addressSearchExports.searchAddresses).toBeTypeOf("function");

    await expect(addressSearchExports.searchAddresses!("Ba")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("normalizes Google Places suggestions into the app contract", async () => {
    expect(addressSearchExports.searchAddresses).toBeTypeOf("function");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            placePrediction: {
              place: "places/abc123",
              placeId: "abc123",
              text: {
                text: "Bahnhofstrasse 1, 8001 Zurich, Switzerland",
              },
              structuredFormat: {
                mainText: {
                  text: "Bahnhofstrasse 1",
                },
                secondaryText: {
                  text: "8001 Zurich, Switzerland",
                },
              },
            },
          },
        ],
      }),
    } as Response);

    await expect(addressSearchExports.searchAddresses!("Bahnhofstrasse")).resolves.toEqual([
      {
        id: "google_places:abc123",
        label: "Bahnhofstrasse 1, 8001 Zurich, Switzerland",
        primaryText: "Bahnhofstrasse 1",
        secondaryText: "8001 Zurich, Switzerland",
      },
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
    });
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({
      includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
      includedRegionCodes: ["ch"],
      regionCode: "CH",
    });
  });

  it("normalizes Google Places details into canonical mailing fields", async () => {
    expect(addressSearchExports.getAddressDetails).toBeTypeOf("function");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "abc123",
        formattedAddress: "Bahnhofstrasse 1, 8001 Zurich, Switzerland",
        addressComponents: [
          {
            longText: "1",
            shortText: "1",
            types: ["street_number"],
          },
          {
            longText: "Bahnhofstrasse",
            shortText: "Bahnhofstr.",
            types: ["route"],
          },
          {
            longText: "8001",
            shortText: "8001",
            types: ["postal_code"],
          },
          {
            longText: "Zurich",
            shortText: "Zurich",
            types: ["locality", "political"],
          },
          {
            longText: "Switzerland",
            shortText: "CH",
            types: ["country", "political"],
          },
        ],
      }),
    } as Response);

    await expect(addressSearchExports.getAddressDetails!("google_places:abc123")).resolves.toEqual({
      id: "google_places:abc123",
      label: "Bahnhofstrasse 1, 8001 Zurich, Switzerland",
      addressLine1: "Bahnhofstrasse 1",
      postalCode: "8001",
      city: "Zurich",
    });
  });

  it("rejects invalid address identifiers before calling Google", async () => {
    expect(addressSearchExports.getAddressDetails).toBeTypeOf("function");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(addressSearchExports.getAddressDetails!("abc123")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects non-Swiss address details", async () => {
    expect(addressSearchExports.getAddressDetails).toBeTypeOf("function");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "abc123",
        formattedAddress: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
        addressComponents: [
          {
            longText: "1600",
            shortText: "1600",
            types: ["street_number"],
          },
          {
            longText: "Amphitheatre Parkway",
            shortText: "Amphitheatre Pkwy",
            types: ["route"],
          },
          {
            longText: "94043",
            shortText: "94043",
            types: ["postal_code"],
          },
          {
            longText: "Mountain View",
            shortText: "Mountain View",
            types: ["locality", "political"],
          },
          {
            longText: "United States",
            shortText: "US",
            types: ["country", "political"],
          },
        ],
      }),
    } as Response);

    await expect(addressSearchExports.getAddressDetails!("google_places:abc123")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("treats missing country data as a provider outage", async () => {
    expect(addressSearchExports.getAddressDetails).toBeTypeOf("function");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "abc123",
        formattedAddress: "Bahnhofstrasse 1, 8001 Zurich, Switzerland",
        addressComponents: [
          {
            longText: "1",
            shortText: "1",
            types: ["street_number"],
          },
          {
            longText: "Bahnhofstrasse",
            shortText: "Bahnhofstr.",
            types: ["route"],
          },
          {
            longText: "8001",
            shortText: "8001",
            types: ["postal_code"],
          },
          {
            longText: "Zurich",
            shortText: "Zurich",
            types: ["locality", "political"],
          },
        ],
      }),
    } as Response);

    await expect(addressSearchExports.getAddressDetails!("google_places:abc123")).rejects.toMatchObject({
      code: "PROVIDER_OUTAGE",
    });
  });
});
