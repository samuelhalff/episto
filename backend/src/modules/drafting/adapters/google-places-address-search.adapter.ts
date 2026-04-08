import { z } from "zod";
import type { AddressDetailsType, AddressSearchResultType } from "@swiss-mail/shared";

import { providerOutageError, validationError } from "../../../shared/errors/index.js";

const GooglePlacesAutocompleteResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string().min(1),
            text: z.object({
              text: z.string().min(1),
            }),
            structuredFormat: z
              .object({
                mainText: z.object({
                  text: z.string().min(1),
                }),
                secondaryText: z
                  .object({
                    text: z.string().min(1),
                  })
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .default([]),
});

const GooglePlaceAddressComponentSchema = z.object({
  longText: z.string().min(1),
  shortText: z.string().optional(),
  types: z.array(z.string()).default([]),
});

const GooglePlaceDetailsResponseSchema = z.object({
  id: z.string().min(1),
  formattedAddress: z.string().min(1),
  addressComponents: z.array(GooglePlaceAddressComponentSchema).default([]),
});

export interface AddressSearchAdapter {
  searchAddresses(query: string): Promise<AddressSearchResultType[]>;
  getAddressDetails(addressId: string): Promise<AddressDetailsType>;
}

export class GooglePlacesAddressSearchAdapter implements AddressSearchAdapter {
  constructor(
    private readonly config: {
      apiBaseUrl: string;
      apiKey: string;
      timeoutMs: number;
    },
  ) {}

  async searchAddresses(query: string): Promise<AddressSearchResultType[]> {
    let response: Response;

    try {
      response = await fetch(new URL("/v1/places:autocomplete", this.config.apiBaseUrl), {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "X-Goog-Api-Key": this.config.apiKey,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
        },
        body: JSON.stringify({
          input: query,
          includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
          includedRegionCodes: ["ch"],
          regionCode: "CH",
        }),
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

    const parsed = GooglePlacesAutocompleteResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw providerOutageError("Address search", parsed.error);
    }

    const predictions = parsed.data.suggestions.flatMap((suggestion) =>
      suggestion.placePrediction ? [suggestion.placePrediction] : [],
    );

    return predictions
      .slice(0, 5)
      .map((prediction) => ({
        id: `google_places:${prediction.placeId}`,
        label: prediction.text.text,
        primaryText: prediction.structuredFormat?.mainText.text ?? prediction.text.text,
        secondaryText: prediction.structuredFormat?.secondaryText?.text ?? null,
        source: "google_places",
      }));
  }

  async getAddressDetails(addressId: string): Promise<AddressDetailsType> {
    const placeId = normalizeGooglePlaceId(addressId);
    let response: Response;

    try {
      response = await fetch(new URL(`/v1/places/${placeId}`, this.config.apiBaseUrl), {
        headers: {
          accept: "application/json",
          "X-Goog-Api-Key": this.config.apiKey,
          "X-Goog-FieldMask": "id,formattedAddress,addressComponents",
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw providerOutageError("Address details", error);
    }

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        throw validationError("Select a valid address suggestion before loading its details.", [
          {
            field: "id",
            message: "Address details request used an invalid google_places identifier.",
          },
        ]);
      }

      throw providerOutageError("Address details");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw providerOutageError("Address details", error);
    }

    const parsed = GooglePlaceDetailsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw providerOutageError("Address details", parsed.error);
    }

    return normalizeGooglePlaceDetails(addressId, parsed.data);
  }
}

function normalizeGooglePlaceId(addressId: string): string {
  return addressId.startsWith("google_places:")
    ? addressId.slice("google_places:".length)
    : addressId;
}

function normalizeGooglePlaceDetails(
  addressId: string,
  details: z.infer<typeof GooglePlaceDetailsResponseSchema>,
): AddressDetailsType {
  const streetNumber = getAddressComponent(details.addressComponents, "street_number")?.longText ?? null;
  const route = getAddressComponent(details.addressComponents, "route")?.longText ?? null;
  const postalCode = getAddressComponent(details.addressComponents, "postal_code")?.longText ?? null;
  const locality =
    getAddressComponent(details.addressComponents, "locality")?.longText ??
    getAddressComponent(details.addressComponents, "postal_town")?.longText ??
    getAddressComponent(details.addressComponents, "administrative_area_level_3")?.longText ??
    null;
  const countryCode = getAddressComponent(details.addressComponents, "country")?.shortText ?? null;
  const addressLine1 = [route, streetNumber].filter(Boolean).join(" ").trim() || null;

  if (countryCode !== "CH") {
    throw validationError("Select a Swiss address suggestion before loading its details.", [
      {
        field: "id",
        message: "Address details must resolve to a Swiss address.",
      },
    ]);
  }

  return {
    id: addressId,
    label: details.formattedAddress,
    addressLine1,
    postalCode,
    city: locality,
    countryCode,
    source: "google_places",
  };
}

function getAddressComponent(
  components: Array<z.infer<typeof GooglePlaceAddressComponentSchema>>,
  type: string,
): z.infer<typeof GooglePlaceAddressComponentSchema> | undefined {
  return components.find((component) => component.types.includes(type));
}
