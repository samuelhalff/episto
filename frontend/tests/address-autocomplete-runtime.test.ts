// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages = {
  addressSearchLabel: "Address search",
  addressSearchPlaceholder: "Search for an address",
  addressSearchHint: "Start typing to search.",
  addressSearchSourceNote: "Source: Federal Office of Topography (swisstopo) via geo.admin.ch.",
  addressSearchUnavailable:
    "Address search is temporarily unavailable. You can still enter the address manually below.",
  addressSearchNoResults: "No addresses found.",
  searchingAddresses: "Searching addresses",
} as const;

const mocks = vi.hoisted(() => ({
  useAddressSearch: vi.fn(),
  useAddressDetails: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: keyof typeof messages) => messages[key] ?? key,
}));

vi.mock("../src/hooks/use-api", () => ({
  useAddressSearch: mocks.useAddressSearch,
  useAddressDetails: mocks.useAddressDetails,
}));

import { AddressAutocompleteField } from "../src/components/product/draft-flow/AddressAutocompleteField";
import { ApiError } from "../src/lib/api";

function createQueryState(overrides: {
  data?: unknown;
  error?: unknown;
  isLoading?: boolean;
  isFetching?: boolean;
} = {}) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isFetching: false,
    ...overrides,
  };
}

function renderField() {
  render(
    React.createElement(AddressAutocompleteField, {
      draftId: "draft-1",
      inputName: "sender-address-search",
      currentAddress: {
        addressLine1: "",
        postalCode: "",
        city: "",
      },
      onResolvedAddress: vi.fn(),
    }),
  );
}

describe("address autocomplete runtime behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.useAddressSearch.mockReset();
    mocks.useAddressDetails.mockReset();
    mocks.useAddressSearch.mockReturnValue(createQueryState({ data: [] }));
    mocks.useAddressDetails.mockReturnValue(createQueryState());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the manual-entry fallback copy for provider outages", () => {
    mocks.useAddressSearch.mockReturnValue(
      createQueryState({
        data: [],
        error: new ApiError(503, {
          error: {
            code: "PROVIDER_OUTAGE",
            userMessage: "An external service is temporarily unavailable. Please try again shortly.",
          },
        }),
      }),
    );

    renderField();

    expect(screen.getByText(messages.addressSearchUnavailable)).toBeTruthy();
    expect(
      screen.queryByText("An external service is temporarily unavailable. Please try again shortly."),
    ).toBeNull();
  });

  it("renders the geo.admin source note below the address-search hint", () => {
    renderField();

    expect(screen.getByText(messages.addressSearchSourceNote)).toBeTruthy();
  });

  it("keeps other API error messages unchanged", () => {
    mocks.useAddressSearch.mockReturnValue(
      createQueryState({
        data: [],
        error: new ApiError(400, {
          error: {
            code: "VALIDATION_ERROR",
            userMessage: "Enter at least 3 characters to search for an address.",
          },
        }),
      }),
    );

    renderField();

    expect(screen.getByText("Enter at least 3 characters to search for an address.")).toBeTruthy();
    expect(screen.queryByText(messages.addressSearchUnavailable)).toBeNull();
  });
});
