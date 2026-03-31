import { describe, expect, it } from "vitest";

import { getIntakeThreadActionMode } from "../src/components/product/draft-flow/intake-thread-state";

describe("getIntakeThreadActionMode", () => {
  const recipientMetadata = {
    workspaceDraft: {
      recipientForm: {
        isCompany: true,
        showManual: false,
        fullName: "",
        companyName: "Swisscom AG",
        selectedCompany: null,
        addressLine1: "",
        postalCode: "",
        city: "",
      },
    },
  };

  it("returns null before the assistant has replied", () => {
    expect(
      getIntakeThreadActionMode(
        { intent: "cancellation", metadata: recipientMetadata },
        [
          {
            id: "user-1",
            draftId: "draft-1",
            role: "user",
            content: "I need help cancelling a contract.",
            toolCalls: null,
            createdAt: new Date(),
          },
        ],
      ),
    ).toBeNull();
  });

  it("keeps the action subtle after a temporary AI outage message", () => {
    expect(
      getIntakeThreadActionMode(
        {
          intent: "cancellation",
          metadata: recipientMetadata,
        },
        [
          {
            id: "user-1",
            draftId: "draft-1",
            role: "user",
            content:
              "I want to cancel my internet contract because I am moving abroad at the end of June.",
            toolCalls: null,
            createdAt: new Date(),
          },
          {
            id: "assistant-1",
            draftId: "draft-1",
            role: "assistant",
            content: "The AI service is temporarily busy. Please try again in a moment.",
            toolCalls: null,
            createdAt: new Date(),
          },
        ],
      ),
    ).toBe("subtle");
  });

  it("keeps the action subtle when the draft body is still too thin", () => {
    expect(
      getIntakeThreadActionMode(
        { intent: "cancellation", metadata: recipientMetadata },
        [
          {
            id: "user-1",
            draftId: "draft-1",
            role: "user",
            content: "Cancel Swisscom internet.",
            toolCalls: null,
            createdAt: new Date(),
          },
          {
            id: "assistant-1",
            draftId: "draft-1",
            role: "assistant",
            content: "I can help with that. Who is the letter for?",
            toolCalls: null,
            createdAt: new Date(),
          },
        ],
      ),
    ).toBe("subtle");
  });

  it("shows the prominent continue action once intake context crosses the minimum threshold", () => {
    expect(
      getIntakeThreadActionMode(
        {
          intent: "cancellation",
          metadata: recipientMetadata,
        },
        [
          {
            id: "user-1",
            draftId: "draft-1",
            role: "user",
            content:
              "I want to cancel my Swisscom internet contract because I am moving abroad at the end of June and need the cancellation to take effect then.",
            toolCalls: null,
            createdAt: new Date(),
          },
          {
            id: "assistant-1",
            draftId: "draft-1",
            role: "assistant",
            content: "What date should the cancellation take effect?",
            toolCalls: null,
            createdAt: new Date(),
          },
        ],
      ),
    ).toBe("prominent");
  });
});
