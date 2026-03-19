"use client";

import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import type { Session } from "@swiss-mail/shared";

function sessionOptions() {
  return queryOptions({
    queryKey: ["sessions", "current"] as const,
    queryFn: () => apiFetch<Session>("/v1/sessions/current"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSession() {
  return useQuery(sessionOptions());
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: { locale?: string | undefined }) =>
      apiFetch<Session>("/v1/sessions", {
        method: "POST",
        body: JSON.stringify(input ?? {}),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionOptions().queryKey, data);
    },
  });
}
