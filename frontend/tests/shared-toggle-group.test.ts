// @vitest-environment jsdom

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppToggleGroup } from "../src/components/ui/app-toggle-group";

describe("AppToggleGroup", () => {
  it("renders segmented options and reports value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      React.createElement(AppToggleGroup, {
        ariaLabel: "Recipient mode",
        value: "person",
        variant: "segmented",
        onChange,
        options: [
          { value: "person", label: "Person" },
          { value: "company", label: "Company" },
        ],
      }),
    );

    await user.click(screen.getByRole("radio", { name: "Company" }));

    expect(onChange).toHaveBeenCalledWith("company");
    expect(screen.getByRole("radio", { name: "Person" }).className).toContain("min-h-11");
    expect(screen.getByRole("radio", { name: "Company" }).className).toContain(
      "min-h-11",
    );
  });

  it("keeps the theme toggle visually neutral until the selected value is resolved", () => {
    render(
      React.createElement(AppToggleGroup, {
        ariaLabel: "Theme",
        value: undefined,
        variant: "theme",
        onChange: vi.fn(),
        options: [
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ],
      }),
    );

    expect(
      within(screen.getByRole("radio", { name: "Light" })).getByText("Light"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("radio", { name: "Dark" })).getByText("Dark"),
    ).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Light" }).getAttribute("data-state")).toBe(
      "off",
    );
    expect(screen.getByRole("radio", { name: "Dark" }).getAttribute("data-state")).toBe(
      "off",
    );
  });

  it("renders non-compact theme options as full labeled buttons instead of icon-only hit targets", () => {
    render(
      React.createElement(AppToggleGroup, {
        ariaLabel: "Theme",
        value: "light",
        variant: "theme",
        onChange: vi.fn(),
        options: [
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ],
      }),
    );

    expect(
      within(screen.getByRole("radio", { name: "Light" })).getByText("Light"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("radio", { name: "Dark" })).getByText("Dark"),
    ).toBeTruthy();
  });

  it("keeps compact theme options readable instead of allowing text truncation", () => {
    render(
      React.createElement(AppToggleGroup, {
        ariaLabel: "Theme",
        value: "light",
        variant: "theme",
        compact: true,
        onChange: vi.fn(),
        options: [
          { value: "light", label: "Sombre" },
          { value: "dark", label: "Chiaro" },
        ],
      }),
    );

    expect(screen.getByRole("group", { name: "Theme" }).className).toContain("shrink-0");
    expect(screen.getByRole("radio", { name: "Sombre" }).className).toContain(
      "min-w-[5rem]",
    );
    expect(
      within(screen.getByRole("radio", { name: "Sombre" })).getByText("Sombre").className,
    ).not.toContain("truncate");
  });
});
