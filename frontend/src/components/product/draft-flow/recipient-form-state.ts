import type { RecipientDraftFormState } from "./workspace-state";

interface RecipientPreviewData {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  addressLine1: string;
  postalCode: string;
  city: string;
}

interface GetInitialRecipientFormStateArgs {
  savedRecipientForm: RecipientDraftFormState | null;
  previewRecipient: RecipientPreviewData | null;
  isDraftLoading: boolean;
  isPreviewLoading: boolean;
}

function getRecipientPreviewName(recipient: RecipientPreviewData): string {
  if (recipient.company?.trim()) {
    return recipient.company.trim();
  }

  return [recipient.firstName ?? "", recipient.lastName ?? ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

export function getInitialRecipientFormState({
  savedRecipientForm,
  previewRecipient,
  isDraftLoading,
  isPreviewLoading,
}: GetInitialRecipientFormStateArgs): RecipientDraftFormState | null {
  if (savedRecipientForm) {
    return savedRecipientForm;
  }

  if (previewRecipient) {
    const recipientName = getRecipientPreviewName(previewRecipient);
    const parts = recipientName.split(" ");
    const isCompany = Boolean(previewRecipient.company?.trim()) || parts.length < 2;

    return {
      isCompany,
      showManual: Boolean(previewRecipient.company?.trim()) || parts.length >= 2,
      fullName: previewRecipient.company?.trim() ? "" : recipientName,
      companyName: previewRecipient.company?.trim()
        ? recipientName
        : parts.length >= 2
          ? ""
          : recipientName,
      selectedCompany: null,
      addressLine1: previewRecipient.addressLine1 ?? "",
      postalCode: previewRecipient.postalCode ?? "",
      city: previewRecipient.city ?? "",
    };
  }

  if (isDraftLoading || isPreviewLoading) {
    return null;
  }

  return {
    isCompany: false,
    showManual: false,
    fullName: "",
    companyName: "",
    selectedCompany: null,
    addressLine1: "",
    postalCode: "",
    city: "",
  };
}
