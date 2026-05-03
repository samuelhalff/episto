import type {
  AddressDetailsType,
  AddressSearchResultType,
  RecipientCompanyDetailsType,
  RecipientCompanySearchResultType,
} from "@episto/shared";

import { env } from "../../shared/config/index.js";
import { providerOutageError, validationError } from "../../shared/errors/index.js";
import {
  GeoAdminAddressSearchAdapter,
  type AddressSearchAdapter,
} from "./adapters/geo-admin-address-search.adapter.js";
import {
  ZefixCompanySearchAdapter,
  type CompanySearchAdapter,
} from "./adapters/zefix-company-search.adapter.js";

let companySearchAdapter: CompanySearchAdapter | null = null;
let addressSearchAdapter: AddressSearchAdapter | null = null;

function getCompanySearchAdapter(): CompanySearchAdapter {
  if (companySearchAdapter) {
    return companySearchAdapter;
  }

  const config = env();

  switch (config.COMPANY_SEARCH_PROVIDER) {
    case "zefix":
      companySearchAdapter = new ZefixCompanySearchAdapter({
        baseUrl: config.ZEFIX_PROXY_BASE_URL,
        timeoutMs: config.COMPANY_SEARCH_TIMEOUT_MS,
      });
      return companySearchAdapter;
    default: {
      const unsupportedProvider: never = config.COMPANY_SEARCH_PROVIDER;
      throw new Error(`Unsupported company search provider: ${unsupportedProvider}`);
    }
  }
}

function getAddressSearchAdapter(): AddressSearchAdapter {
  if (addressSearchAdapter) {
    return addressSearchAdapter;
  }

  const config = env();

  switch (config.ADDRESS_SEARCH_PROVIDER) {
    case "geo_admin":
      addressSearchAdapter = new GeoAdminAddressSearchAdapter({
        apiBaseUrl: config.GEO_ADMIN_API_BASE_URL,
        timeoutMs: config.ADDRESS_SEARCH_TIMEOUT_MS,
      });
      return addressSearchAdapter;
    case "none":
      throw providerOutageError("Address search");
    default: {
      const unsupportedProvider: never = config.ADDRESS_SEARCH_PROVIDER;
      throw new Error(`Unsupported address search provider: ${unsupportedProvider}`);
    }
  }
}

export async function searchRecipientCompanies(
  query: string,
): Promise<RecipientCompanySearchResultType[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    throw validationError("Enter at least 2 characters to search for a company.", [
      { field: "query", message: "Company search requires at least 2 characters." },
    ]);
  }

  return getCompanySearchAdapter().searchCompanies(normalizedQuery);
}

export async function getRecipientCompanyDetails(
  id: string,
): Promise<RecipientCompanyDetailsType> {
  const normalizedId = id.trim();

  if (normalizedId.length === 0) {
    throw validationError("Select a company before loading its details.", [
      { field: "id", message: "Company details require a company identifier." },
    ]);
  }

  return getCompanySearchAdapter().getCompanyDetails(normalizedId);
}

export async function searchAddresses(query: string): Promise<AddressSearchResultType[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 3) {
    throw validationError("Enter at least 3 characters to search for an address.", [
      { field: "query", message: "Address search requires at least 3 characters." },
    ]);
  }

  return getAddressSearchAdapter().searchAddresses(normalizedQuery);
}

export async function getAddressDetails(id: string): Promise<AddressDetailsType> {
  const normalizedId = id.trim();

  if (!/^addr:[A-Za-z0-9_-]+$/.test(normalizedId)) {
    throw validationError(
      "Select a valid address suggestion before loading its details.",
      [
        {
          field: "id",
          message: "Address details require a valid address lookup identifier.",
        },
      ],
    );
  }

  return getAddressSearchAdapter().getAddressDetails(normalizedId);
}
