// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
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
  });
});
