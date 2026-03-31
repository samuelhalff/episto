import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRecipientCompanyDetails,
  searchRecipientCompanies,
} from "../src/modules/drafting/address-search.service.js";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    COMPANY_SEARCH_PROVIDER: "zefix",
    COMPANY_SEARCH_TIMEOUT_MS: 5000,
    ZEFIX_PROXY_BASE_URL: "http://zefix-proxy:8081",
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
