"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DraftDispatchQuote } from "@episto/shared";
import { apiFetch } from "../lib/api";
import { useDispatchQuote } from "./use-dispatch-quote";

export interface PromoQuoteResult {
  quote: DraftDispatchQuote;
  promo: {
    code: string;
    kind: "free" | "percent" | "fixed";
    discountCents: number;
    finalCents: number;
  };
}

export interface PromoQuoteState extends PromoQuoteResult {
  baseQuoteAtValidation: DraftDispatchQuote | null;
}

export function usePromoQuote(draftId: string, promoCode: string, enabled = true) {
  const [debouncedCode, setDebouncedCode] = useState("");
  const normalizedCode = promoCode.trim().toUpperCase();
  const baseQuote = useDispatchQuote(draftId, enabled);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCode(normalizedCode), 300);
    return () => window.clearTimeout(timer);
  }, [normalizedCode]);

  const query = useQuery({
    queryKey: ["drafts", draftId, "promo-quote", debouncedCode] as const,
    queryFn: async () => {
      const result = await apiFetch<PromoQuoteResult>(
        `/v1/drafts/${draftId}/promo-quote`,
        {
          method: "POST",
          body: JSON.stringify({ promoCode: debouncedCode }),
        },
      );
      return {
        ...result,
        baseQuoteAtValidation: baseQuote.data ?? null,
      };
    },
    enabled:
      Boolean(draftId) && enabled && Boolean(debouncedCode) && Boolean(baseQuote.data),
    staleTime: 30_000,
  });

  const isPendingValidation = Boolean(normalizedCode) && normalizedCode !== debouncedCode;
  const isValidated =
    Boolean(normalizedCode) && normalizedCode === debouncedCode && Boolean(query.data);

  return {
    ...query,
    result: query.data ?? null,
    debouncedCode,
    isPendingValidation,
    isValidated,
  };
}
