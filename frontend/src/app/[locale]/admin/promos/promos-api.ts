import type {
  AdminPromo,
  AdminPromoDeleteResponse,
  AdminPromoFilter,
  AdminPromosResponse,
  CreateAdminPromoInput,
  UpdateAdminPromoInput,
} from "@episto/shared";

import { adminDelete, adminFetch, adminPatch, adminPost } from "../admin-api";

export function fetchAdminPromos(filter: AdminPromoFilter) {
  return adminFetch<AdminPromosResponse>(`/admin/promos?filter=${filter}`);
}

export function createAdminPromo(input: CreateAdminPromoInput) {
  return adminPost<AdminPromo>("/admin/promos", input);
}

export function updateAdminPromo(id: string, input: UpdateAdminPromoInput) {
  return adminPatch<AdminPromo>(`/admin/promos/${id}`, input);
}

export function toggleAdminPromoActive(id: string, active: boolean) {
  return adminPost<AdminPromo>(`/admin/promos/${id}/toggle-active`, { active });
}

export function deleteAdminPromo(id: string) {
  return adminDelete<AdminPromoDeleteResponse>(`/admin/promos/${id}`);
}
