// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages = {
  "dispatch.title.accepted": "Accepted for dispatch",
  "dispatch.subtitle.accepted":
    "The provider has confirmed receipt of your letter for dispatch.",
  "dispatch.reference.label": "Provider reference",
  "dispatch.reference.trackingAvailable": "Tracking available for this shipment",
  "dispatch.reference.noTracking": "No tracking available for this shipment",
  "dispatch.reference.pending":
    "A provider reference will appear here if one becomes available.",
  "dispatch.reference.mockLabel": "Mock provider confirmation",
  "dispatch.reference.mockBody":
    "Live ePost delivery is disabled in this environment. No fee-bearing submission was made.",
  "dispatch.step.submitted": "Submitted to printing",
  "dispatch.step.accepted": "Accepted for dispatch",
  "dispatch.step.dispatching": "Delivery status pending",
  "dispatch.step.providerNote": "Updates depend on provider capability",
  "dispatch.lastChecked": "Last updated: {time}",
} as const;

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) => (key: string, values?: Record<string, string>) => {
      const scopedKey = namespace ? `${namespace}.${key}` : key;
      const template = messages[scopedKey as keyof typeof messages] ?? scopedKey;
      if (!values) return template;
      return Object.entries(values).reduce(
        (result, [name, value]) => result.replace(`{${name}}`, value),
        template,
      );
    },
}));

import { DispatchConfirmation } from "../src/components/product/DispatchConfirmation";

describe("DispatchConfirmation", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows an explicit mock-mode notice when the dispatch confirmation was simulated", () => {
    render(
      React.createElement(DispatchConfirmation, {
        dispatchState: "accepted",
        providerReference: "mock-epost-registered-1234",
        providerMode: "mock",
        isTrackable: true,
        submittedAt: "2026-04-08T12:00:00.000Z",
        lastCheckedAt: "2026-04-08T12:00:05.000Z",
      }),
    );

    expect(screen.getByText(messages["dispatch.reference.mockLabel"])).toBeTruthy();
    expect(screen.getByText(messages["dispatch.reference.mockBody"])).toBeTruthy();
    expect(screen.getByText("mock-epost-registered-1234")).toBeTruthy();
  });
});
