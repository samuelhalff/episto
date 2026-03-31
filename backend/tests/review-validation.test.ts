import { describe, expect, it } from "vitest";

import { getReviewMissingFields } from "../src/modules/drafting/review-validation.js";

describe("getReviewMissingFields", () => {
  it("accepts drafts without a signature", () => {
    expect(
      getReviewMissingFields({
        subject: "Termination notice",
        body: "Please accept this as notice.",
        senderProfileId: "sender-1",
        recipientProfileId: "recipient-1",
      }),
    ).toEqual([]);
  });

  it("treats blank subject and body as missing", () => {
    expect(
      getReviewMissingFields({
        subject: "   ",
        body: "",
        senderProfileId: "sender-1",
        recipientProfileId: "recipient-1",
      }),
    ).toEqual([
      { field: "subject", message: "Subject is required" },
      { field: "body", message: "Body is required" },
    ]);
  });

  it("requires sender and recipient profiles", () => {
    expect(
      getReviewMissingFields({
        subject: "Subject",
        body: "Body",
        senderProfileId: null,
        recipientProfileId: null,
      }),
    ).toEqual([
      { field: "sender", message: "Sender profile is required" },
      { field: "recipient", message: "Recipient profile is required" },
    ]);
  });
});
