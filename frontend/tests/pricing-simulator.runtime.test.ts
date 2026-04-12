// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/i18n/navigation", async () => {
  const React = await import("react");

  return {
    Link: ({ href, children, ...props }: Record<string, unknown>) =>
      React.createElement(
        "a",
        { href: typeof href === "string" ? href : String(href ?? "#"), ...props },
        children,
      ),
  };
});

import { PricingSimulator } from "../src/components/marketing/PricingSimulator";
import type { PricingProvider } from "../src/components/marketing/pricing-types";

globalThis.React = React;

const t = (key: string, values?: Record<string, string | number | Date>) => {
  const messages: Record<string, string> = {
    simulatorTitle: "Pricing simulator",
    letterTypeLabel: "Letter type",
    pagesLabel: "Pages",
    increasePagesLabel: "Increase pages",
    decreasePagesLabel: "Decrease pages",
    standardOptionTitle: "Standard",
    registeredOptionTitle: "Registered",
    standardAdditionalPageLabel: "Each additional page",
    registeredAdditionalPageLabel: "Each additional page",
    pageSingular: "page",
    pagePlural: "pages",
    pageLimitNote: "Maximum {maxPages} pages",
    priceUnavailable: "Price unavailable",
  };

  return (messages[key] ?? key)
    .replace("{pages}", String(values?.pages ?? ""))
    .replace("{maxPages}", String(values?.maxPages ?? ""));
};

const mockProviderBreakdown: PricingProvider = {
  providerName: "ePost",
  note: "Public pricing examples come from the active stored provider rate matrix.",
  sourceUrl: "https://www.epost.example/pricing",
  verifiedDate: "2026-04-07",
  referenceScenario: {
    shippingCountry: "CH",
    envelopeSize: "C5",
    windowLocation: "RIGHT",
    duplex: false,
    attachmentMode: "none",
    standardPostage: "A_POST",
    registeredPostage: "REGISTERED",
  },
  pageCountExamples: {
    standard: [
      {
        pageCount: 1,
        providerQuotedCents: 155,
        providerQuotedDisplayPrice: "CHF 1.55",
        totalCents: 495,
        displayPrice: "CHF 4.95",
        currency: "CHF",
      },
      {
        pageCount: 2,
        providerQuotedCents: 170,
        providerQuotedDisplayPrice: "CHF 1.70",
        totalCents: 510,
        displayPrice: "CHF 5.10",
        currency: "CHF",
      },
      {
        pageCount: 3,
        providerQuotedCents: 185,
        providerQuotedDisplayPrice: "CHF 1.85",
        totalCents: 525,
        displayPrice: "CHF 5.25",
        currency: "CHF",
      },
    ],
    registered: [
      {
        pageCount: 1,
        providerQuotedCents: 578,
        providerQuotedDisplayPrice: "CHF 5.78",
        totalCents: 918,
        displayPrice: "CHF 9.18",
        currency: "CHF",
      },
      {
        pageCount: 2,
        providerQuotedCents: 593,
        providerQuotedDisplayPrice: "CHF 5.93",
        totalCents: 933,
        displayPrice: "CHF 9.33",
        currency: "CHF",
      },
      {
        pageCount: 3,
        providerQuotedCents: 608,
        providerQuotedDisplayPrice: "CHF 6.08",
        totalCents: 948,
        displayPrice: "CHF 9.48",
        currency: "CHF",
      },
    ],
  },
  pricesExcludeVat: true,
  currency: "CHF",
};

describe("pricing simulator runtime", () => {
  afterEach(() => cleanup());

  it("uses wider page stepper buttons without increasing their height", () => {
    render(
      React.createElement(PricingSimulator, {
        loading: false,
        provider: mockProviderBreakdown,
        t,
      }),
    );

    const decreaseButton = screen.getByRole("button", { name: "Decrease pages" });
    const increaseButton = screen.getByRole("button", { name: "Increase pages" });

    expect(decreaseButton.className).toContain("h-10");
    expect(decreaseButton.className).toContain("w-12");
    expect(increaseButton.className).toContain("h-10");
    expect(increaseButton.className).toContain("w-12");
  });

  it("shows the fixed 5-page product limit while updating the live total", async () => {
    const user = userEvent.setup();
    const props: React.ComponentProps<typeof PricingSimulator> = {
      loading: false,
      provider: mockProviderBreakdown,
      t,
    };

    render(React.createElement(PricingSimulator, props));

    expect(screen.getByRole("radiogroup", { name: "Letter type" })).toBeTruthy();
    expect(screen.getByText("Standard · 1 page")).toBeTruthy();
    expect(screen.getByText("CHF 4.95")).toBeTruthy();
    expect(screen.getByText("Maximum 5 pages")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Increase pages" }));
    expect(screen.getByText("Standard · 2 pages")).toBeTruthy();
    expect(screen.getByText("CHF 5.10")).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: "Registered" }));
    expect(screen.getByText("Registered · 2 pages")).toBeTruthy();
    expect(screen.getByText("CHF 9.33")).toBeTruthy();
  });

  it("caps the simulator at the highest available page example", async () => {
    const user = userEvent.setup();

    render(
      React.createElement(PricingSimulator, {
        loading: false,
        provider: mockProviderBreakdown,
        t,
      }),
    );

    const increaseButton = screen.getByRole("button", { name: "Increase pages" });

    await user.click(increaseButton);
    await user.click(increaseButton);

    expect(screen.getByText("Standard · 3 pages")).toBeTruthy();
    expect(screen.getByText("CHF 5.25")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Increase pages" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("Maximum 5 pages")).toBeTruthy();
  });
});
