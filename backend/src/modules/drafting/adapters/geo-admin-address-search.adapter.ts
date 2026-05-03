import { z } from "zod";
import type { AddressDetailsType, AddressSearchResultType } from "@episto/shared";

import { providerOutageError, validationError } from "../../../shared/errors/index.js";

const GEO_ADMIN_SEARCH_PATH = "/rest/services/ech/SearchServer";
const GEO_ADMIN_OFFICIAL_ADDRESS_PATH =
  "/rest/services/ech/MapServer/ch.swisstopo.amtliches-gebaeudeadressverzeichnis";
const OFFICIAL_ADDRESS_LAYER = "ch.swisstopo.amtliches-gebaeudeadressverzeichnis";
const ADDRESS_LOOKUP_PREFIX = "addr:";

const GeoAdminLinkSchema = z.object({
  href: z.string().min(1),
  title: z.string().min(1),
});

const GeoAdminSearchResponseSchema = z.object({
  results: z
    .array(
      z.object({
        attrs: z.object({
          label: z.string().min(1),
          links: z.array(GeoAdminLinkSchema).default([]),
        }),
      }),
    )
    .default([]),
});

const GeoAdminOfficialAddressDetailSchema = z.object({
  feature: z.object({
    attributes: z.object({
      stn_label: z.string().min(1),
      adr_number: z.string().optional(),
      zip_label: z.string().min(1),
    }),
  }),
});

const GeoAdminAddressLookupTokenSchema = z.object({
  provider: z.literal("geo_admin"),
  officialFeatureId: z.string().regex(/^\d+$/),
});

export interface AddressSearchAdapter {
  searchAddresses(query: string): Promise<AddressSearchResultType[]>;
  getAddressDetails(addressId: string): Promise<AddressDetailsType>;
}

export class GeoAdminAddressSearchAdapter implements AddressSearchAdapter {
  constructor(
    private readonly config: {
      apiBaseUrl: string;
      timeoutMs: number;
    },
  ) {}

  async searchAddresses(query: string): Promise<AddressSearchResultType[]> {
    const url = new URL(GEO_ADMIN_SEARCH_PATH, this.config.apiBaseUrl);
    url.searchParams.set("searchText", query);
    url.searchParams.set("type", "locations");
    url.searchParams.set("origins", "address");
    url.searchParams.set("limit", "5");
    url.searchParams.set("returnGeometry", "false");

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          accept: "application/json",
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw providerOutageError("Address search", error);
    }

    if (!response.ok) {
      throw providerOutageError("Address search");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw providerOutageError("Address search", error);
    }

    const parsed = GeoAdminSearchResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw providerOutageError("Address search", parsed.error);
    }

    return parsed.data.results.flatMap((result) => {
      const officialFeatureId = extractOfficialFeatureId(result.attrs.links);
      if (!officialFeatureId) {
        return [];
      }

      const parts = splitGeoAdminLabel(result.attrs.label);
      if (!parts.primaryText) {
        return [];
      }

      return [
        {
          id: encodeGeoAdminLookupId(officialFeatureId),
          label: parts.secondaryText
            ? `${parts.primaryText}, ${parts.secondaryText}`
            : parts.primaryText,
          primaryText: parts.primaryText,
          secondaryText: parts.secondaryText,
        },
      ];
    });
  }

  async getAddressDetails(addressId: string): Promise<AddressDetailsType> {
    const { officialFeatureId } = decodeGeoAdminLookupId(addressId);
    const url = new URL(
      `${GEO_ADMIN_OFFICIAL_ADDRESS_PATH}/${officialFeatureId}`,
      this.config.apiBaseUrl,
    );
    url.searchParams.set("returnGeometry", "false");

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          accept: "application/json",
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw providerOutageError("Address details", error);
    }

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        throw invalidAddressLookupId();
      }

      throw providerOutageError("Address details");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw providerOutageError("Address details", error);
    }

    const parsed = GeoAdminOfficialAddressDetailSchema.safeParse(payload);
    if (!parsed.success) {
      throw providerOutageError("Address details", parsed.error);
    }

    return normalizeOfficialAddressDetail(addressId, parsed.data);
  }
}

function extractOfficialFeatureId(
  links: Array<z.infer<typeof GeoAdminLinkSchema>>,
): string | null {
  const officialLink = links.find((link) => link.title === OFFICIAL_ADDRESS_LAYER);
  if (!officialLink) {
    return null;
  }

  const match = officialLink.href.match(
    /^\/rest\/services\/ech\/MapServer\/ch\.swisstopo\.amtliches-gebaeudeadressverzeichnis\/(\d+)$/,
  );

  return match?.[1] ?? null;
}

function splitGeoAdminLabel(label: string): {
  primaryText: string;
  secondaryText: string | null;
} {
  const match = label.match(/^(.*?)\s*<b>(.*?)<\/b>\s*$/i);
  const primaryText = normalizeStreetSegment(stripHtml(match?.[1] ?? label));
  const secondaryText = match ? normalizeWhitespace(stripHtml(match[2] ?? "")) : null;

  return {
    primaryText,
    secondaryText: secondaryText || null,
  };
}

function normalizeOfficialAddressDetail(
  addressId: string,
  details: z.infer<typeof GeoAdminOfficialAddressDetailSchema>,
): AddressDetailsType {
  const streetName = normalizeWhitespace(details.feature.attributes.stn_label);
  const addressNumber = normalizeAddressNumber(
    details.feature.attributes.adr_number ?? null,
  );
  const location = splitZipLabel(details.feature.attributes.zip_label);

  if (!streetName || !location) {
    throw providerOutageError("Address details");
  }

  const addressLine1 =
    [streetName, addressNumber].filter(Boolean).join(" ").trim() || streetName;
  const label = `${addressLine1}, ${location.postalCode} ${location.city}`;

  return {
    id: addressId,
    label,
    addressLine1,
    postalCode: location.postalCode,
    city: location.city,
  };
}

function splitZipLabel(zipLabel: string): { postalCode: string; city: string } | null {
  const match = normalizeWhitespace(zipLabel).match(/^(\d{4})\s+(.+)$/);
  if (!match) {
    return null;
  }

  const [, postalCode, city] = match;
  if (!postalCode || !city) {
    return null;
  }

  return {
    postalCode,
    city,
  };
}

function normalizeAddressNumber(value: string | null): string | null {
  const normalized = normalizeWhitespace(value ?? "");
  if (!normalized || normalized === "#" || normalized === "-") {
    return null;
  }

  return normalized;
}

function normalizeStreetSegment(value: string): string {
  return normalizeWhitespace(value)
    .replace(/\s+(#|-)\s*$/, "")
    .trim();
}

function stripHtml(value: string): string {
  return normalizeWhitespace(value.replace(/<[^>]+>/g, " "));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function encodeGeoAdminLookupId(officialFeatureId: string): string {
  return `${ADDRESS_LOOKUP_PREFIX}${Buffer.from(
    JSON.stringify({
      provider: "geo_admin",
      officialFeatureId,
    }),
    "utf8",
  ).toString("base64url")}`;
}

function decodeGeoAdminLookupId(
  addressId: string,
): z.infer<typeof GeoAdminAddressLookupTokenSchema> {
  if (!addressId.startsWith(ADDRESS_LOOKUP_PREFIX)) {
    throw invalidAddressLookupId();
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(
      Buffer.from(addressId.slice(ADDRESS_LOOKUP_PREFIX.length), "base64url").toString(
        "utf8",
      ),
    );
  } catch {
    throw invalidAddressLookupId();
  }

  const parsed = GeoAdminAddressLookupTokenSchema.safeParse(decoded);
  if (!parsed.success) {
    throw invalidAddressLookupId();
  }

  return parsed.data;
}

function invalidAddressLookupId() {
  return validationError(
    "Select a valid address suggestion before loading its details.",
    [
      {
        field: "id",
        message: "Address details require a valid address lookup identifier.",
      },
    ],
  );
}
