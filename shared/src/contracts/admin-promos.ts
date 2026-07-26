import { z } from "zod";

// ---------------------------------------------------------------------------
// Admin promo-code management contracts
//
// The promo_codes table (schema/promos.ts) is the source of truth. "Expired"
// (perimé) is derived — past expiry OR fully redeemed — not a stored state.
// A one-time code is simply maxRedemptions = 1 (a single global redemption).
// ---------------------------------------------------------------------------

export type AdminPromoKind = "free" | "percent" | "fixed";

/** Filter tabs. "expired" = past expiry or fully redeemed; independent of active. */
export type AdminPromoFilter = "active" | "expired" | "inactive" | "all";

/** Derived per-row status shown as a badge. */
export type AdminPromoStatus = "active" | "expired" | "inactive";

export interface AdminPromo {
  id: string;
  code: string;
  kind: AdminPromoKind;
  /** 0 for free; whole percent 0–100 for percent; CHF cents for fixed. */
  value: number;
  /** null = unlimited; otherwise the global redemption cap. */
  maxRedemptions: number | null;
  redeemedCount: number;
  expiresAt: string | null;
  active: boolean;
  note: string | null;
  status: AdminPromoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPromosResponse {
  promos: AdminPromo[];
}

export interface AdminPromoDeleteResponse {
  outcome: "hard_deleted" | "archived";
  promoId: string;
}

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const adminPromoKindSchema = z.enum(["free", "percent", "fixed"]);

export const adminPromoFilterSchema = z
  .enum(["active", "expired", "inactive", "all"])
  .default("active");

export const listAdminPromosQuerySchema = z.object({
  filter: adminPromoFilterSchema,
});

/** trim + uppercase, mirroring normalizePromoCode. */
const promoCodeField = z
  .string()
  .trim()
  .min(1, "Enter a code.")
  .max(64)
  .transform((c) => c.toUpperCase());

const promoNoteField = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

/** null = unlimited; otherwise a positive cap (one-time = 1). */
const maxRedemptionsField = z.number().int().min(1).nullable();

/** An explicit instant (the UI converts Zurich-local date+time to ISO). */
const expiresAtField = z.string().datetime({ offset: true }).nullable();

function refineKindValue(
  data: { kind: AdminPromoKind; value: number },
  ctx: z.RefinementCtx,
): void {
  if (data.kind === "free" && data.value !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Free codes must have value 0.",
    });
  }
  if (data.kind === "percent" && (data.value < 0 || data.value > 100)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Percent must be between 0 and 100.",
    });
  }
}

export const createAdminPromoSchema = z
  .object({
    code: promoCodeField,
    kind: adminPromoKindSchema,
    value: z.number().int().min(0),
    maxRedemptions: maxRedemptionsField,
    expiresAt: expiresAtField,
    active: z.boolean(),
    note: promoNoteField,
  })
  .superRefine(refineKindValue);

/**
 * Edit: same fields minus `active` (activation is the dedicated toggle endpoint
 * so a single mutation owns usability). Code is accepted but the server rejects
 * a change once the code has been redeemed.
 */
export const updateAdminPromoSchema = z
  .object({
    code: promoCodeField,
    kind: adminPromoKindSchema,
    value: z.number().int().min(0),
    maxRedemptions: maxRedemptionsField,
    expiresAt: expiresAtField,
    note: promoNoteField,
  })
  .superRefine(refineKindValue);

export const toggleAdminPromoSchema = z.object({
  active: z.boolean(),
});

export const promoIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateAdminPromoInput = z.infer<typeof createAdminPromoSchema>;
export type UpdateAdminPromoInput = z.infer<typeof updateAdminPromoSchema>;
export type ListAdminPromosQuery = z.infer<typeof listAdminPromosQuerySchema>;
