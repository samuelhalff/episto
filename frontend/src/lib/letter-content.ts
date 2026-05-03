import { getApiUrl } from "./api";

type SubjectLocale = "de-CH" | "fr-CH" | "it-CH" | "en-CH";

type NamedProfile = {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  department?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
};

const SUBJECT_PREFIX_BY_LOCALE: Record<SubjectLocale, string> = {
  "de-CH": "Betreff:",
  "fr-CH": "Concerne:",
  "it-CH": "Oggetto:",
  "en-CH": "RE:",
};

const SUBJECT_PREFIX_PATTERN =
  /^(?:re|regarding|concerne|concernant|betreff|oggetto)(?:\s*:|\s+)/i;

function trimText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLetterSubject(
  subject: string | null | undefined,
  locale: string,
): string | null {
  const trimmed = trimText(subject);
  if (!trimmed) {
    return null;
  }

  const normalizedBody = trimmed.replace(SUBJECT_PREFIX_PATTERN, "").trim();
  const prefix =
    SUBJECT_PREFIX_BY_LOCALE[(locale as SubjectLocale) ?? "de-CH"] ??
    SUBJECT_PREFIX_BY_LOCALE["de-CH"];

  return normalizedBody ? `${prefix} ${normalizedBody}` : prefix;
}

export function getSenderDisplayName(profile: NamedProfile | null | undefined): string {
  const fullName = [trimText(profile?.firstName), trimText(profile?.lastName)]
    .filter(Boolean)
    .join(" ");

  return fullName || trimText(profile?.company);
}

export function getRecipientDisplayName(
  profile: NamedProfile | null | undefined,
): string {
  const company = trimText(profile?.company);
  if (company) {
    return company;
  }

  return [trimText(profile?.firstName), trimText(profile?.lastName)]
    .filter(Boolean)
    .join(" ");
}

export function getAddressLines(
  profile: NamedProfile | null | undefined,
  type: "sender" | "recipient",
): string[] {
  if (!profile) {
    return [];
  }

  const lines: string[] = [];
  const fullName = [trimText(profile.firstName), trimText(profile.lastName)]
    .filter(Boolean)
    .join(" ");
  const company = trimText(profile.company);
  const department = trimText(profile.department);

  if (type === "recipient") {
    if (company) {
      lines.push(company);
    }
    if (department) {
      lines.push(department);
    }
    if (fullName) {
      lines.push(fullName);
    }
  } else {
    if (fullName) {
      lines.push(fullName);
    }
    if (company) {
      lines.push(company);
    }
  }

  const addressLine1 = trimText(profile.addressLine1);
  const addressLine2 = trimText(profile.addressLine2);
  const locality = [trimText(profile.postalCode), trimText(profile.city)]
    .filter(Boolean)
    .join(" ");

  if (addressLine1) {
    lines.push(addressLine1);
  }
  if (addressLine2) {
    lines.push(addressLine2);
  }
  if (locality) {
    lines.push(locality);
  }
  if (profile.country && profile.country !== "CH") {
    lines.push(profile.country);
  }

  return lines;
}

export function getSignaturePreviewUrl(
  signatureFileId: string | null | undefined,
): string | null {
  // Signature previews must stay on the app origin because storage URLs may point to
  // internal or HTTP-only object stores that browsers cannot load directly.
  return signatureFileId ? getApiUrl(`/v1/files/${signatureFileId}/preview`) : null;
}

export function getSignatureInlineUrl(
  signatureFileId: string | null | undefined,
): string | null {
  return signatureFileId ? getApiUrl(`/v1/files/${signatureFileId}/inline`) : null;
}

export function hasConcreteSignature(
  signatureMode: string | null | undefined,
  signatureFileId: string | null | undefined,
): boolean {
  if (signatureMode === "typed") {
    return true;
  }

  return signatureMode === "drawn" && Boolean(signatureFileId);
}
