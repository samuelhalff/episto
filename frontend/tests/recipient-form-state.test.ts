import { describe, expect, it } from "vitest";

import { getInitialRecipientFormState } from "../src/components/product/draft-flow/recipient-form-state";

describe("getInitialRecipientFormState", () => {
  it("waits for the draft and preview state before falling back to person mode", () => {
    expect(
      getInitialRecipientFormState({
        savedRecipientForm: null,
        previewRecipient: null,
        isDraftLoading: true,
        isPreviewLoading: false,
      }),
    ).toBeNull();

    expect(
      getInitialRecipientFormState({
        savedRecipientForm: null,
        previewRecipient: null,
        isDraftLoading: false,
        isPreviewLoading: true,
      }),
    ).toBeNull();
  });

  it("prefers the saved workspace form when it already exists", () => {
    const savedRecipientForm = {
      isCompany: true,
      showManual: true,
      fullName: "",
      companyName: "Acme SA",
      selectedCompany: null,
      addressLine1: "Rue du Rhone 1",
      postalCode: "1204",
      city: "Geneva",
    };

    expect(
      getInitialRecipientFormState({
        savedRecipientForm,
        previewRecipient: null,
        isDraftLoading: false,
        isPreviewLoading: false,
      }),
    ).toEqual(savedRecipientForm);
  });

  it("derives company mode from a preview recipient company", () => {
    expect(
      getInitialRecipientFormState({
        savedRecipientForm: null,
        previewRecipient: {
          firstName: null,
          lastName: null,
          company: "Acme SA",
          department: null,
          addressLine1: "Rue du Rhone 1",
          addressLine2: null,
          postalCode: "1204",
          city: "Geneva",
          country: "CH",
        },
        isDraftLoading: false,
        isPreviewLoading: false,
      }),
    ).toEqual({
      isCompany: true,
      showManual: true,
      fullName: "",
      companyName: "Acme SA",
      selectedCompany: null,
      addressLine1: "Rue du Rhone 1",
      postalCode: "1204",
      city: "Geneva",
    });
  });

  it("falls back to a blank person form only after both sources resolve empty", () => {
    expect(
      getInitialRecipientFormState({
        savedRecipientForm: null,
        previewRecipient: null,
        isDraftLoading: false,
        isPreviewLoading: false,
      }),
    ).toEqual({
      isCompany: false,
      showManual: false,
      fullName: "",
      companyName: "",
      selectedCompany: null,
      addressLine1: "",
      postalCode: "",
      city: "",
    });
  });
});
