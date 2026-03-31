"use client";

import { useQuery } from "@tanstack/react-query";
import type { RecipientCompanyDetailsResponseType } from "@swiss-mail/shared";

import { apiFetch } from "../lib/api";

export function useRecipientCompanyDetails(
  draftId: string,
  companyId: string,
  enabled: boolean,
) {
  const normalizedCompanyId = companyId.trim();

  return useQuery({
    queryKey: ["drafts", draftId, "recipient-company-details", normalizedCompanyId] as const,
    queryFn: () =>
      apiFetch<RecipientCompanyDetailsResponseType>(
        `/v1/drafts/${draftId}/recipient/company-details?id=${encodeURIComponent(normalizedCompanyId)}`,
      ).then((response) => response.company),
    enabled: enabled && normalizedCompanyId.length > 0,
    staleTime: 60_000,
  });
}
