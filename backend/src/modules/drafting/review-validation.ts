export interface ReviewMissingField {
  field: "subject" | "body" | "sender" | "recipient";
  message: string;
}

interface ReviewValidationDraft {
  subject: string | null;
  body: string | null;
  senderProfileId: string | null;
  recipientProfileId: string | null;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getReviewMissingFields(
  draft: ReviewValidationDraft,
): ReviewMissingField[] {
  const missingFields: ReviewMissingField[] = [];

  if (!hasText(draft.subject)) {
    missingFields.push({ field: "subject", message: "Subject is required" });
  }

  if (!hasText(draft.body)) {
    missingFields.push({ field: "body", message: "Body is required" });
  }

  if (!draft.senderProfileId) {
    missingFields.push({ field: "sender", message: "Sender profile is required" });
  }

  if (!draft.recipientProfileId) {
    missingFields.push({
      field: "recipient",
      message: "Recipient profile is required",
    });
  }

  return missingFields;
}
