import { describe, expect, it } from "vitest";
import { getDraftWorkspaceState, mergeDraftWorkspaceState } from "../src/workspace-draft.js";

describe("workspace draft state", () => {
  it("normalizes malformed sender and recipient form values", () => {
    const state = getDraftWorkspaceState({
      workspaceDraft: {
        senderForm: {
          fullName: undefined,
          addressLine1: "Bahnhofstrasse 1",
          postalCode: 8001,
          city: null,
        },
        recipientForm: {
          isCompany: "yes",
          showManual: undefined,
          fullName: undefined,
          companyName: "Swisscom",
          addressLine1: undefined,
          postalCode: undefined,
          city: "Bern",
        },
        furthestUnlockedStepIndex: 9,
      },
    });

    expect(state.senderForm).toEqual({
      fullName: "",
      addressLine1: "Bahnhofstrasse 1",
      postalCode: "",
      city: "",
    });
    expect(state.recipientForm).toEqual({
      isCompany: false,
      showManual: false,
      fullName: "",
      companyName: "Swisscom",
      selectedCompany: null,
      addressLine1: "",
      postalCode: "",
      city: "Bern",
    });
    expect(state.furthestUnlockedStepIndex).toBeUndefined();
  });

  it("merges and removes workspace keys deterministically", () => {
    const metadata = mergeDraftWorkspaceState(null, {
      senderForm: {
        fullName: "Sam Example",
        addressLine1: "Bahnhofstrasse 1",
        postalCode: "8001",
        city: "Zurich",
      },
      furthestUnlockedStepIndex: 4,
    });

    expect(getDraftWorkspaceState(metadata).senderForm?.fullName).toBe("Sam Example");
    expect(getDraftWorkspaceState(metadata).furthestUnlockedStepIndex).toBe(4);

    const cleared = mergeDraftWorkspaceState(metadata, {
      senderForm: null,
      furthestUnlockedStepIndex: null,
    });
    expect(getDraftWorkspaceState(cleared).senderForm).toBeUndefined();
    expect(getDraftWorkspaceState(cleared).furthestUnlockedStepIndex).toBeUndefined();
  });
});
