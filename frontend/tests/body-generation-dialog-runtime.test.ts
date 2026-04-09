// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/components/product/draft-flow/ui", () => ({
  PrimaryButton: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => React.createElement("button", { type: "button", onClick }, children),
  SecondaryButton: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      "button",
      { type: "button", onClick, disabled: Boolean(disabled) },
      children,
    ),
}));

import { BodyGenerationDialog } from "../src/components/product/draft-flow/BodyGenerationDialog";

describe("body generation dialog runtime behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lets the user dismiss the error sheet without refreshing", async () => {
    const onClose = vi.fn();

    render(
      React.createElement(BodyGenerationDialog, {
        open: true,
        status: "error",
        loadingTitle: "Drafting your letter",
        loadingDescription: "Please wait while we prepare the first version.",
        loadingLabel: "Drafting",
        errorTitle: "We couldn't draft the content",
        errorDescription: "Refresh or close this sheet to continue.",
        refreshLabel: "Refresh draft",
        supportLabel: "Contact support",
        closeLabel: "Close",
        onRefresh: vi.fn(),
        onClose,
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
