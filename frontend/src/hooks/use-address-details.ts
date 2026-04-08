"use client";

import { useQuery } from "@tanstack/react-query";
import type { AddressDetailsResponseType } from "@swiss-mail/shared";

import { apiFetch } from "../lib/api";

export function useAddressDetails(draftId: string, addressId: string, enabled: boolean) {
  const normalizedAddressId = addressId.trim();

  return useQuery({
    queryKey: ["drafts", draftId, "address-details", normalizedAddressId] as const,
    queryFn: () =>
      apiFetch<AddressDetailsResponseType>(
        `/v1/drafts/${draftId}/address-details?id=${encodeURIComponent(normalizedAddressId)}`,
      ).then((response) => response.address),
    enabled: enabled && normalizedAddressId.length > 0,
    staleTime: 60_000,
  });
}
