"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, type AdminPromo, type AdminPromoFilter } from "@episto/shared";
import { Plus } from "lucide-react";

import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppButton } from "@/components/ui/app-button";
import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminAuth } from "../admin-auth-context";
import { PanelError, PanelLoading, SectionPanel } from "../admin-metric-panels";
import { PromoTable } from "./promo-table";
import { PromoFormDialog, type PromoFormSubmit } from "./promo-form-dialog";
import {
  createAdminPromo,
  deleteAdminPromo,
  fetchAdminPromos,
  toggleAdminPromoActive,
  updateAdminPromo,
} from "./promos-api";

const FILTERS: { value: AdminPromoFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

export default function PromosPage() {
  const { authenticated } = useAdminAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AdminPromoFilter>("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPromo | null>(null);
  const [deleting, setDeleting] = useState<AdminPromo | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: queryKeys.admin.promos(filter),
    queryFn: () => fetchAdminPromos(filter),
    enabled: authenticated,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "promos"] });
  }

  const saveMutation = useMutation({
    mutationFn: (values: PromoFormSubmit) =>
      editing
        ? updateAdminPromo(editing.id, {
            code: values.code,
            kind: values.kind,
            value: values.value,
            maxRedemptions: values.maxRedemptions,
            expiresAt: values.expiresAt,
            note: values.note,
          })
        : createAdminPromo(values),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : "Could not save the code.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (promo: AdminPromo) => toggleAdminPromoActive(promo.id, !promo.active),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (promo: AdminPromo) => deleteAdminPromo(promo.id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  const busyId =
    toggleMutation.isPending && toggleMutation.variables
      ? toggleMutation.variables.id
      : deleteMutation.isPending && deleteMutation.variables
        ? deleteMutation.variables.id
        : null;

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(promo: AdminPromo) {
    setEditing(promo);
    setFormError(null);
    setFormOpen(true);
  }

  const promos = q.data?.promos ?? [];

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
            Promo codes
          </h2>
          <p className="text-sm" style={{ color: "var(--app-muted)" }}>
            Create reusable percentage codes, fixed-amount or free codes, and one-time
            codes (redemption limit 1). Codes are enforced server-side at checkout.
          </p>
        </div>
        <AppButton
          variant="primary"
          size="sm"
          leadingIcon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
        >
          New code
        </AppButton>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as AdminPromoFilter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <SectionPanel title="Codes">
        {q.isLoading ? (
          <PanelLoading />
        ) : q.error ? (
          <PanelError message="Failed to load promo codes." />
        ) : promos.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: "var(--app-muted)" }}>
            No codes in this view.
          </p>
        ) : (
          <PromoTable
            promos={promos}
            onEdit={openEdit}
            onToggle={(promo) => toggleMutation.mutate(promo)}
            onDelete={(promo) => setDeleting(promo)}
            busyId={busyId}
          />
        )}
      </SectionPanel>

      <PromoFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        promo={editing}
        onSubmit={(values) => {
          setFormError(null);
          saveMutation.mutate(values);
        }}
        pending={saveMutation.isPending}
        errorMessage={formError}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogPanel size="sm">
          <div>
            <DialogTitle className="text-lg font-semibold tracking-tight text-[var(--app-fg)]">
              Delete {deleting?.code}?
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] text-[var(--app-muted)]">
              {deleting && deleting.redeemedCount > 0
                ? "This code has been redeemed, so it will be archived (deactivated) and kept for history rather than deleted."
                : "This code was never redeemed and will be permanently deleted."}
            </DialogDescription>
            <div className="mt-5 flex justify-end gap-2">
              <AppButton variant="ghost" size="sm" onClick={() => setDeleting(null)}>
                Cancel
              </AppButton>
              <AppButton
                variant="destructive"
                size="sm"
                loading={deleteMutation.isPending}
                onClick={() => deleting && deleteMutation.mutate(deleting)}
              >
                {deleting && deleting.redeemedCount > 0 ? "Archive" : "Delete"}
              </AppButton>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  );
}
