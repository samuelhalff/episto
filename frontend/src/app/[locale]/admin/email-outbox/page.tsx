"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { RotateCw } from "lucide-react";

import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { AppButton } from "@/components/ui/app-button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminAuth } from "../admin-auth-context";
import { PanelError, PanelLoading, SectionPanel } from "../admin-metric-panels";
import {
  fetchAdminEmailOutbox,
  retryAdminOutboxEmail,
  type EmailOutboxItem,
} from "../admin-api";

const REFETCH_MS = 30_000;

const STATUS_TONE: Record<string, NonNullable<BadgeProps["tone"]>> = {
  failed: "danger",
  sending: "warning",
  pending: "warning",
};

export default function EmailOutboxPage() {
  const { authenticated } = useAdminAuth();
  const queryClient = useQueryClient();
  const [retryError, setRetryError] = useState<string | null>(null);

  const outbox = useQuery({
    queryKey: queryKeys.admin.emailOutbox(),
    queryFn: () => fetchAdminEmailOutbox(),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });

  const retryMutation = useMutation({
    mutationFn: (email: EmailOutboxItem) => retryAdminOutboxEmail(email.id),
    onSuccess: () => {
      setRetryError(null);
      // The row's status and attempt count both change, and the health badge
      // counts the same rows — refetch rather than guess at the new state.
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.emailOutbox() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.health() });
    },
    onError: (err: unknown) => {
      // The backend refuses retries it cannot honour (already delivered, payload
      // discarded). Showing that refusal is the point — a button that quietly
      // does nothing would leave the operator believing the mail is on its way.
      setRetryError(err instanceof Error ? err.message : "Could not retry this email.");
    },
  });

  const emails = outbox.data?.emails ?? [];
  const busyId =
    retryMutation.isPending && retryMutation.variables
      ? retryMutation.variables.id
      : null;

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Undelivered email
        </h2>
        <p className="max-w-3xl text-sm" style={{ color: "var(--app-muted)" }}>
          Transactional email we promised a customer and have not delivered: rows that
          failed outright, and rows still being retried that have already burned most of
          their attempts. A missing order email is a customer with no way back to the
          letter they paid for, so treat anything here as a person waiting.
        </p>
      </div>

      {retryError ? <PanelError message={retryError} /> : null}

      {outbox.isLoading ? (
        <PanelLoading />
      ) : outbox.error ? (
        <PanelError message="Failed to load the email outbox" />
      ) : (
        <SectionPanel title={`Needs attention (${emails.length})`}>
          {emails.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--app-muted)" }}>
              Nothing undelivered. Every promised email has been sent.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last error</TableHead>
                  <TableHead>Last attempt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="whitespace-nowrap">{email.recipient}</TableCell>
                    <TableCell>
                      {email.template}
                      <span className="ml-1" style={{ color: "var(--app-muted)" }}>
                        {email.locale}
                      </span>
                    </TableCell>
                    <TableCell>{email.reference ?? "—"}</TableCell>
                    <TableCell>
                      <Badge tone={STATUS_TONE[email.status] ?? "neutral"}>
                        {email.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{email.attempts}</TableCell>
                    <TableCell
                      className="max-w-[22rem] whitespace-normal break-words text-xs"
                      style={{ color: "var(--app-muted)" }}
                    >
                      {email.lastError ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {email.lastAttemptedAt
                        ? new Date(email.lastAttemptedAt).toLocaleString()
                        : new Date(email.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <AppButton
                        variant="secondary"
                        size="sm"
                        // Only a failed row can be retried by hand; the others
                        // are still in the automatic retry ladder and a manual
                        // push would risk a second copy in the inbox.
                        disabled={email.status !== "failed" || busyId === email.id}
                        onClick={() => {
                          retryMutation.mutate(email);
                        }}
                      >
                        <RotateCw className="h-4 w-4" />
                        {busyId === email.id ? "Retrying…" : "Retry"}
                      </AppButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionPanel>
      )}
    </div>
  );
}
