import { z } from "zod";
import type {
  RecipientCompanyDetailsType,
  RecipientCompanySearchResultType,
} from "@swiss-mail/shared";

import { providerOutageError } from "../../../shared/errors/index.js";

const ZefixCompanySearchItemSchema = z.object({
  name: z.string(),
  ehraid: z.number().int().nullable().optional(),
  uid: z.string().nullable().optional(),
  chid: z.string().nullable().optional(),
  legalSeat: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

const ZefixCompanySearchResponseSchema = z.array(ZefixCompanySearchItemSchema);

const ZefixCompanyAddressSchema = z.object({
  street: z.string().nullable().optional(),
  houseNumber: z.string().nullable().optional(),
  addon: z.string().nullable().optional(),
  poBox: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  swissZipCode: z.string().nullable().optional(),
});

const ZefixCompanyFullSchema = z.object({
  name: z.string(),
  address: ZefixCompanyAddressSchema.nullable().optional(),
});

const ZefixCompanyFullResponseSchema = z.union([
  ZefixCompanyFullSchema,
  z.array(ZefixCompanyFullSchema).min(1),
]);

export interface CompanySearchAdapter {
  searchCompanies(query: string): Promise<RecipientCompanySearchResultType[]>;
  getCompanyDetails(companyId: string): Promise<RecipientCompanyDetailsType>;
}

export class ZefixCompanySearchAdapter implements CompanySearchAdapter {
  constructor(
    private readonly config: {
      baseUrl: string;
      timeoutMs: number;
    },
  ) {}

  async searchCompanies(query: string): Promise<RecipientCompanySearchResultType[]> {
    const url = new URL("/company-search", this.config.baseUrl);
    url.searchParams.set("name", query);

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          accept: "application/json",
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw providerOutageError("Official company registry search", error);
    }

    if (!response.ok) {
      throw providerOutageError("Official company registry search");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw providerOutageError("Official company registry search", error);
    }

    const parsed = ZefixCompanySearchResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw providerOutageError("Official company registry search", parsed.error);
    }

    return parsed.data.map((item) => ({
      id: `zefix:${item.ehraid ?? item.uid ?? item.chid ?? item.name}`,
      name: item.name,
      registryUid: item.uid ?? null,
      registryChid: item.chid ?? null,
      registryId: item.ehraid != null ? String(item.ehraid) : null,
      registryStatus: item.status ?? null,
      legalSeat: item.legalSeat ?? null,
      source: "zefix",
    }));
  }

  async getCompanyDetails(companyId: string): Promise<RecipientCompanyDetailsType> {
    const identifier = parseZefixCompanyIdentifier(companyId);
    const url = new URL("/company-details", this.config.baseUrl);
    url.searchParams.set(identifier.kind, identifier.value);

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          accept: "application/json",
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw providerOutageError("Official company registry details", error);
    }

    if (!response.ok) {
      throw providerOutageError("Official company registry details");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw providerOutageError("Official company registry details", error);
    }

    const parsed = ZefixCompanyFullResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw providerOutageError("Official company registry details", parsed.error);
    }

    const company = Array.isArray(parsed.data) ? parsed.data[0] : parsed.data;
    if (!company) {
      throw providerOutageError("Official company registry details");
    }
    const address = company.address ?? null;

    return {
      id: companyId,
      name: company.name,
      addressLine1: buildAddressLine1(address),
      postalCode: address?.swissZipCode?.trim() || null,
      city: address?.city?.trim() || null,
      source: "zefix",
    };
  }
}

function parseZefixCompanyIdentifier(companyId: string): { kind: "uid" | "ehraid" | "chid"; value: string } {
  const normalized = companyId.startsWith("zefix:") ? companyId.slice("zefix:".length) : companyId;

  if (/^\d+$/.test(normalized)) {
    return { kind: "ehraid", value: normalized };
  }

  if (/^CHE/i.test(normalized)) {
    return { kind: "uid", value: normalized };
  }

  if (/^CH/i.test(normalized)) {
    return { kind: "chid", value: normalized };
  }

  throw providerOutageError("Official company registry details");
}

function buildAddressLine1(
  address: z.infer<typeof ZefixCompanyAddressSchema> | null,
): string | null {
  if (!address) {
    return null;
  }

  const streetLine = [address.street, address.houseNumber, address.addon]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  if (streetLine) {
    return streetLine;
  }

  const poBox = address.poBox?.trim();
  return poBox ? `PO Box ${poBox}` : null;
}
