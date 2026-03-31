import type {
  RecipientCompanyDetailsType,
  RecipientCompanySearchResultType,
} from "@swiss-mail/shared";

import { env } from "../../shared/config/index.js";
import { validationError } from "../../shared/errors/index.js";
import {
  ZefixCompanySearchAdapter,
  type CompanySearchAdapter,
} from "./adapters/zefix-company-search.adapter.js";

let companySearchAdapter: CompanySearchAdapter | null = null;

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
