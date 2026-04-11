import { beforeEach, describe, expect, it, vi } from "vitest";

import * as addressSearchService from "../src/modules/drafting/address-search.service.js";
import { assertDefined } from "./assert-defined";

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
    ADDRESS_SEARCH_PROVIDER: "geo_admin",
    ADDRESS_SEARCH_TIMEOUT_MS: 5000,
    GEO_ADMIN_API_BASE_URL: "https://api3.geo.admin.ch",
  }),
}));

function getSearchAddresses() {
  return assertDefined(addressSearchExports.searchAddresses, "Expected searchAddresses export");
}

function getAddressDetails() {
  return assertDefined(addressSearchExports.getAddressDetails, "Expected getAddressDetails export");
}

function createGeoAdminSearchResponse(label: string, officialFeatureId: string) {
  return {
    results: [
      {
        attrs: {
          label,
          origin: "address",
          links: [
            {
              rel: "related",
              title: "ch.swisstopo.amtliches-gebaeudeadressverzeichnis",
              href: `/rest/services/ech/MapServer/ch.swisstopo.amtliches-gebaeudeadressverzeichnis/${officialFeatureId}`,
            },
          ],
        },
      },
    ],
  };
}

function createOfficialAddressDetailResponse(
  overrides: Partial<{
    stn_label: string;
    adr_number: string;
    zip_label: string;
  }> = {},
) {
  return {
    feature: {
      attributes: {
        stn_label: "Bahnhofstrasse",
        adr_number: "1",
        zip_label: "8001 Zürich",
        ...overrides,
      },
    },
  };
}

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

    await expect(getSearchAddresses()("Ba")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("normalizes geo.admin suggestions into the app contract", async () => {
    expect(addressSearchExports.searchAddresses).toBeTypeOf("function");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => createGeoAdminSearchResponse(
        "Bahnhofstrasse 1 <b>8001 Zürich</b>",
        "102358038",
      ),
    } as Response);

    const results = (await getSearchAddresses()("Bahnhofstrasse")) as Array<{
      id: string;
      label: string;
      primaryText: string;
      secondaryText: string | null;
    }>;

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      label: "Bahnhofstrasse 1, 8001 Zürich",
      primaryText: "Bahnhofstrasse 1",
      secondaryText: "8001 Zürich",
    });
    expect(results[0]?.id).toMatch(/^addr:[A-Za-z0-9_-]+$/);
    expect(results[0]?.id).not.toContain("google");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const searchUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(searchUrl.origin + searchUrl.pathname).toBe(
      "https://api3.geo.admin.ch/rest/services/ech/SearchServer",
    );
    expect(searchUrl.searchParams.get("type")).toBe("locations");
    expect(searchUrl.searchParams.get("origins")).toBe("address");
    expect(searchUrl.searchParams.get("limit")).toBe("5");
    expect(searchUrl.searchParams.get("searchText")).toBe("Bahnhofstrasse");
  });

  it("loads geo.admin official address details into canonical mailing fields", async () => {
    expect(addressSearchExports.getAddressDetails).toBeTypeOf("function");

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createGeoAdminSearchResponse(
          "Bahnhofstrasse 1 <b>8001 Zürich</b>",
          "102358038",
        ),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createOfficialAddressDetailResponse(),
      } as Response);

    const [result] = (await getSearchAddresses()("Bahnhofstrasse")) as Array<{
      id: string;
    }>;
    const resultId = assertDefined(result, "Expected geo.admin search result").id;

    await expect(getAddressDetails()(resultId)).resolves.toEqual({
      id: resultId,
      label: "Bahnhofstrasse 1, 8001 Zürich",
      addressLine1: "Bahnhofstrasse 1",
      postalCode: "8001",
      city: "Zürich",
    });

    const detailsUrl = new URL(String(fetchSpy.mock.calls[1]?.[0]));
    expect(detailsUrl.origin + detailsUrl.pathname).toBe(
      "https://api3.geo.admin.ch/rest/services/ech/MapServer/ch.swisstopo.amtliches-gebaeudeadressverzeichnis/102358038",
    );
    expect(detailsUrl.searchParams.get("returnGeometry")).toBe("false");
  });

  it("rejects invalid address identifiers before calling geo.admin", async () => {
    expect(addressSearchExports.getAddressDetails).toBeTypeOf("function");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(getAddressDetails()("abc123")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("strips placeholder house numbers from official detail records", async () => {
    expect(addressSearchExports.getAddressDetails).toBeTypeOf("function");

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createGeoAdminSearchResponse(
          "Bahnhofstrasse # <b>7323 Wangs</b>",
          "103676173",
        ),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createOfficialAddressDetailResponse({
            stn_label: "Bahnhofstrasse",
            adr_number: "#",
            zip_label: "7323 Wangs",
          }),
      } as Response);

    const [result] = (await getSearchAddresses()("Bahnhofstr")) as Array<{
      id: string;
    }>;
    const resultId = assertDefined(result, "Expected geo.admin search result").id;

    await expect(getAddressDetails()(resultId)).resolves.toEqual({
      id: resultId,
      label: "Bahnhofstrasse, 7323 Wangs",
      addressLine1: "Bahnhofstrasse",
      postalCode: "7323",
      city: "Wangs",
    });
  });

  it("treats malformed geo.admin detail data as a provider outage", async () => {
    expect(addressSearchExports.getAddressDetails).toBeTypeOf("function");

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createGeoAdminSearchResponse(
          "Bahnhofstrasse 1 <b>8001 Zürich</b>",
          "102358038",
        ),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createOfficialAddressDetailResponse({
            zip_label: "Zürich",
          }),
      } as Response);

    const [result] = (await getSearchAddresses()("Bahnhofstrasse")) as Array<{
      id: string;
    }>;
    const resultId = assertDefined(result, "Expected geo.admin search result").id;

    await expect(getAddressDetails()(resultId)).rejects.toMatchObject({
      code: "PROVIDER_OUTAGE",
    });
  });
});
