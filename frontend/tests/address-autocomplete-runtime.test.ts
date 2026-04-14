// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages = {
  addressSearchLabel: "Address search",
  addressSearchPlaceholder: "Search for an address",
  addressSearchHint: "Start typing to search.",
  addressSearchSourceNote:
    "Source: Federal Office of Topography (swisstopo) via geo.admin.ch.",
  addressSearchApplyingSelection: "Applying the selected address...",
  addressSearchUnavailable:
    "Address search is temporarily unavailable. You can still enter the address manually below.",
  addressSearchNoResults: "No addresses found.",
  addressSearchSelectionRequired:
    "Choose an address suggestion or clear the search field to continue with manual entry below.",
  addressSearchClear: "Clear",
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

function createQueryState(
  overrides: {
    data?: unknown;
    error?: unknown;
    isLoading?: boolean;
    isFetching?: boolean;
  } = {},
) {
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
            userMessage:
              "An external service is temporarily unavailable. Please try again shortly.",
          },
        }),
      }),
    );

    renderField();

    expect(screen.getByText(messages.addressSearchUnavailable)).toBeTruthy();
    expect(
      screen.queryByText(
        "An external service is temporarily unavailable. Please try again shortly.",
      ),
    ).toBeNull();
    expect(screen.queryByText(messages.addressSearchSourceNote)).toBeNull();
  });

  it("renders the geo.admin source note below the address-search hint", () => {
    renderField();

    expect(screen.getByText(messages.addressSearchSourceNote)).toBeTruthy();
  });

  it("swaps the helper copy for a single manual-entry hint and clears the query on demand", () => {
    mocks.useAddressSearch.mockReturnValue(
      createQueryState({
        data: [
          {
            id: "addr:test-token",
            label: "Bahnhofstrasse 1, 8001 Zürich",
            primaryText: "Bahnhofstrasse 1",
            secondaryText: "8001 Zürich",
          },
        ],
      }),
    );

    renderField();

    const sourceNote = screen.getByText(messages.addressSearchSourceNote);
    const clearButton = screen.getByRole("button", { name: messages.addressSearchClear });
    const input = screen.getByRole("textbox") as HTMLInputElement;

    expect(sourceNote.className).toContain("text-[10px]");
    expect(clearButton.disabled).toBe(true);

    fireEvent.change(input, {
      target: { value: "Bahnhofstrasse" },
    });

    expect(screen.getByText(messages.addressSearchSelectionRequired)).toBeTruthy();
    expect(screen.queryByText(messages.addressSearchHint)).toBeNull();
    expect(clearButton.disabled).toBe(false);

    fireEvent.click(clearButton);

    expect(input.value).toBe("");
    expect(screen.getByText(messages.addressSearchHint)).toBeTruthy();
    expect(screen.queryByText(messages.addressSearchSelectionRequired)).toBeNull();
    expect(clearButton.disabled).toBe(true);
  });

  it("shows an applying state while the selected address details are still loading", () => {
    mocks.useAddressSearch.mockReturnValue(
      createQueryState({
        data: [
          {
            id: "addr:test-token",
            label: "Bahnhofstrasse 1, 8001 Zürich",
            primaryText: "Bahnhofstrasse 1",
            secondaryText: "8001 Zürich",
          },
        ],
      }),
    );
    mocks.useAddressDetails.mockReturnValue(
      createQueryState({
        isLoading: true,
      }),
    );

    renderField();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Bahnhofstrasse" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Bahnhofstrasse 1/i }));

    expect(screen.getByText(messages.addressSearchApplyingSelection)).toBeTruthy();
    expect(screen.getByText("Bahnhofstrasse 1, 8001 Zürich")).toBeTruthy();
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

    expect(
      screen.getByText("Enter at least 3 characters to search for an address."),
    ).toBeTruthy();
    expect(screen.queryByText(messages.addressSearchUnavailable)).toBeNull();
  });
});
