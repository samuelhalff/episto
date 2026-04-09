import { describe, expect, it } from "vitest";

import { getAddressLines } from "../src/lib/letter-content";

describe("letter content helpers", () => {
  it("does not duplicate a sender company when no personal name is present", () => {
    expect(
      getAddressLines(
        {
          firstName: null,
          lastName: null,
          company: "Sendly AG",
          addressLine1: "Limmatquai 10",
          addressLine2: null,
          postalCode: "8001",
          city: "Zurich",
          country: "CH",
        },
        "sender",
      ),
    ).toEqual(["Sendly AG", "Limmatquai 10", "8001 Zurich"]);
  });

  it("keeps the country line for non-Swiss sender and recipient addresses", () => {
    expect(
      getAddressLines(
        {
          firstName: "Anna",
          lastName: "Meier",
          company: null,
          addressLine1: "Unter den Linden 5",
          addressLine2: null,
          postalCode: "10117",
          city: "Berlin",
          country: "DE",
        },
        "sender",
      ),
    ).toEqual(["Anna Meier", "Unter den Linden 5", "10117 Berlin", "DE"]);

    expect(
      getAddressLines(
        {
          firstName: "Marc",
          lastName: "Dubois",
          company: "Cabinet Juridique",
          department: "Litigation",
          addressLine1: "Rue du Rhone 9",
          addressLine2: null,
          postalCode: "75008",
          city: "Paris",
          country: "FR",
        },
        "recipient",
      ),
    ).toEqual([
      "Cabinet Juridique",
      "Litigation",
      "Marc Dubois",
      "Rue du Rhone 9",
      "75008 Paris",
      "FR",
    ]);
  });
});
