import { describe, expect, it } from "vitest";
import {
  DraftWorkspacePatchSchema,
  getDraftWorkspaceState,
  mergeDraftWorkspaceState,
} from "../src/workspace-draft.js";

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

  it("leaves keys the patch does not mention alone", () => {
    const metadata = mergeDraftWorkspaceState(
      { aiDocument: { version: "1.0" } },
      {
        intakeInput: "Ich möchte kündigen.",
        templateContext: {
          slug: "wohnung-kuendigen",
          checklist: [],
          considerations: [],
        },
      },
    );

    const next = mergeDraftWorkspaceState(metadata, { templateContext: null });

    expect(getDraftWorkspaceState(next).intakeInput).toBe("Ich möchte kündigen.");
    expect(getDraftWorkspaceState(next).templateContext).toBeUndefined();
    // Metadata outside the workspace namespace belongs to other writers.
    expect(next.aiDocument).toEqual({ version: "1.0" });
  });

  it("treats an undefined value as absent rather than as a removal", () => {
    const metadata = mergeDraftWorkspaceState(null, { intakeInput: "kept" });
    const next = mergeDraftWorkspaceState(metadata, {
      intakeInput: undefined,
      bodyRefineInput: "added",
    });

    expect(getDraftWorkspaceState(next).intakeInput).toBe("kept");
    expect(getDraftWorkspaceState(next).bodyRefineInput).toBe("added");
  });
});

describe("the workspace patch schema", () => {
  it("rejects keys that are not part of the workspace state", () => {
    expect(
      DraftWorkspacePatchSchema.safeParse({ aiDocument: { version: "1.0" } }).success,
    ).toBe(false);
  });

  it("rejects a template slug that is not a known draft template", () => {
    expect(
      DraftWorkspacePatchSchema.safeParse({
        templateContext: { slug: "../../etc/passwd", checklist: [], considerations: [] },
      }).success,
    ).toBe(false);
  });

  it("accepts null as an explicit removal", () => {
    expect(DraftWorkspacePatchSchema.safeParse({ templateContext: null }).success).toBe(
      true,
    );
  });
});
