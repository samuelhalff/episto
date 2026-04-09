import { describe, expect, it } from "vitest";

import {
  getRecipientStepValidation,
  getSenderStepValidation,
} from "../src/components/product/draft-flow/step-validation";

describe("draft step validation", () => {
  it("requires a full sender address and no unresolved autocomplete interaction", () => {
    expect(
      getSenderStepValidation({
        fullName: "Sam Example",
        addressLine1: "Bahnhofstrasse 1",
        postalCode: "8001",
        city: "Zurich",
        isResolvingSelection: false,
        requiresAddressSelection: false,
      }).canProceed,
    ).toBe(true);

    expect(
      getSenderStepValidation({
        fullName: "Sam Example",
        addressLine1: "Bahnhofstrasse 1",
        postalCode: "8001",
        city: "Zurich",
        isResolvingSelection: false,
        requiresAddressSelection: true,
      }).canProceed,
    ).toBe(false);
  });

  it("blocks company recipients while the user is still in company-search mode", () => {
    expect(
      getRecipientStepValidation({
        isCompany: true,
        showManual: false,
        fullName: "",
        companyName: "Ark Fiduciaire SA",
        addressLine1: "Boulevard Georges-Favon 26",
        postalCode: "1204",
        city: "Geneva",
        hasSelectedCompany: false,
        isResolvingSelection: false,
        requiresAddressSelection: false,
      }).canProceed,
    ).toBe(false);
  });

  it("allows manual company recipients once identity, address, and selection state are complete", () => {
    expect(
      getRecipientStepValidation({
        isCompany: true,
        showManual: true,
        fullName: "",
        companyName: "Ark Fiduciaire SA",
        addressLine1: "Boulevard Georges-Favon 26",
        postalCode: "1204",
        city: "Geneva",
        hasSelectedCompany: true,
        isResolvingSelection: false,
        requiresAddressSelection: false,
      }).canProceed,
    ).toBe(true);
  });
});
