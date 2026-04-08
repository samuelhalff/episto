// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages = {
  addressFieldsLoadingSelection: "Loading the selected address into the fields below.",
} as const;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: keyof typeof messages) => messages[key] ?? key,
}));

import { AddressFields } from "../src/components/product/draft-flow/AddressFields";

type PendingAddressFieldsProps = React.ComponentProps<typeof AddressFields> & {
  isResolvingSelection: boolean;
  pendingSelectionLabel: string;
};

describe("address fields loading state", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a loading placeholder instead of stale values while a selected address is resolving", () => {
    render(
      React.createElement(
        AddressFields as React.ComponentType<PendingAddressFieldsProps>,
        {
          namePrefix: "sender",
          addressLine1: "Old Street 7",
          postalCode: "9999",
          city: "Oldtown",
          onAddressLine1Change: vi.fn(),
          onPostalCodeChange: vi.fn(),
          onCityChange: vi.fn(),
          isResolvingSelection: true,
          pendingSelectionLabel: "Bahnhofstrasse 1, 8001 Zürich",
        },
      ),
    );

    expect(screen.getByText(messages.addressFieldsLoadingSelection)).toBeTruthy();
    expect(screen.getByText("Bahnhofstrasse 1, 8001 Zürich")).toBeTruthy();
    expect(screen.queryByDisplayValue("Old Street 7")).toBeNull();
    expect(screen.queryByDisplayValue("9999")).toBeNull();
    expect(screen.queryByDisplayValue("Oldtown")).toBeNull();
  });
});
