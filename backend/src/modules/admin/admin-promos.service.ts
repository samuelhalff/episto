import { and, desc, eq, ne } from "drizzle-orm";
import type {
  AdminPromo,
  AdminPromoDeleteResponse,
  AdminPromoFilter,
  AdminPromoStatus,
  CreateAdminPromoInput,
  UpdateAdminPromoInput,
} from "@episto/shared";

import { getDb, schema, type Db } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import { normalizePromoCode } from "../payments/promo.service.js";

// ---------------------------------------------------------------------------
// Admin promo-code CRUD.
//
// The promo_codes table is the source of truth. "Expired" is derived from
// expiry or redemption exhaustion, never stored. Volume is tiny (a handful of
// codes), so listing loads all rows and derives status/filter in JS.
// ---------------------------------------------------------------------------

type PromoRow = typeof schema.promoCodes.$inferSelect;

function promoConflict(code: string, message: string, userMessage: string): AppError {
  return new AppError({
    family: "validation_error",
    statusCode: 409,
    code,
    message,
    userMessage,
    userAction: null,
  });
}

/** past expiry OR fully redeemed → expired; else inactive if disabled; else active. */
export function derivePromoStatus(
  row: Pick<PromoRow, "expiresAt" | "maxRedemptions" | "redeemedCount" | "active">,
  now: Date,
): AdminPromoStatus {
  const expired =
    (row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime()) ||
    (row.maxRedemptions !== null && row.redeemedCount >= row.maxRedemptions);
  if (expired) return "expired";
  if (!row.active) return "inactive";
  return "active";
}

function toAdminPromo(row: PromoRow, now: Date): AdminPromo {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    value: row.value,
    maxRedemptions: row.maxRedemptions,
    redeemedCount: row.redeemedCount,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    active: row.active,
    note: row.note,
    status: derivePromoStatus(row, now),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** active / inactive / expired partition the set cleanly; all = everything. */
function matchesFilter(status: AdminPromoStatus, filter: AdminPromoFilter): boolean {
  if (filter === "all") return true;
  return status === filter;
}

export async function listAdminPromos(
  filter: AdminPromoFilter,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<AdminPromo[]> {
  const rows = await db
    .select()
    .from(schema.promoCodes)
    .orderBy(desc(schema.promoCodes.active), desc(schema.promoCodes.updatedAt));
  return rows
    .map((row) => toAdminPromo(row, now))
    .filter((promo) => matchesFilter(promo.status, filter));
}

async function getPromoRow(db: Db, id: string): Promise<PromoRow> {
  const [row] = await db
    .select()
    .from(schema.promoCodes)
    .where(eq(schema.promoCodes.id, id))
    .limit(1);
  if (!row) {
    throw new AppError({
      family: "validation_error",
      statusCode: 404,
      code: "PROMO_NOT_FOUND",
      message: "Promo code not found",
      userMessage: "This promo code no longer exists.",
      userAction: null,
    });
  }
  return row;
}

async function assertCodeUnique(db: Db, code: string, excludeId?: string): Promise<void> {
  const clash = await db
    .select({ id: schema.promoCodes.id })
    .from(schema.promoCodes)
    .where(
      excludeId
        ? and(eq(schema.promoCodes.code, code), ne(schema.promoCodes.id, excludeId))
        : eq(schema.promoCodes.code, code),
    )
    .limit(1);
  if (clash.length > 0) {
    throw promoConflict(
      "PROMO_CODE_EXISTS",
      `Promo code ${code} already exists`,
      "A code with this name already exists.",
    );
  }
}

export async function createAdminPromo(
  input: CreateAdminPromoInput,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<AdminPromo> {
  // Normalize defensively so the service is correct regardless of caller.
  const code = normalizePromoCode(input.code);
  await assertCodeUnique(db, code);
  const [row] = await db
    .insert(schema.promoCodes)
    .values({
      code,
      kind: input.kind,
      value: input.value,
      maxRedemptions: input.maxRedemptions,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      active: input.active,
      note: input.note,
    })
    .returning();
  if (!row) throw new Error("Failed to create promo code");
  return toAdminPromo(row, now);
}

export async function updateAdminPromo(
  id: string,
  input: UpdateAdminPromoInput,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<AdminPromo> {
  const existing = await getPromoRow(db, id);
  const code = normalizePromoCode(input.code);

  // A redeemed code's identifier is frozen so historical receipts stay legible.
  if (existing.redeemedCount > 0 && code !== existing.code) {
    throw promoConflict(
      "PROMO_CODE_IMMUTABLE",
      "Cannot rename a promo code that has been redeemed",
      "This code has already been used and can no longer be renamed.",
    );
  }
  // Never let the cap drop below what has already been redeemed.
  if (input.maxRedemptions !== null && input.maxRedemptions < existing.redeemedCount) {
    throw promoConflict(
      "PROMO_MAX_BELOW_USAGE",
      `maxRedemptions ${input.maxRedemptions} is below redeemedCount ${existing.redeemedCount}`,
      `This code has already been redeemed ${existing.redeemedCount} time(s); the limit cannot be lower.`,
    );
  }
  await assertCodeUnique(db, code, id);

  const [row] = await db
    .update(schema.promoCodes)
    .set({
      code,
      kind: input.kind,
      value: input.value,
      maxRedemptions: input.maxRedemptions,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      note: input.note,
      updatedAt: new Date(),
    })
    .where(eq(schema.promoCodes.id, id))
    .returning();
  if (!row) throw new Error("Failed to update promo code");
  return toAdminPromo(row, now);
}

export async function setAdminPromoActive(
  id: string,
  active: boolean,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<AdminPromo> {
  const existing = await getPromoRow(db, id);
  // Deactivation is always allowed; re-activation must not resurrect a code that
  // is already expired or fully redeemed (it could never be used again).
  if (active && derivePromoStatus(existing, now) === "expired") {
    throw promoConflict(
      "PROMO_NOT_USABLE",
      "Cannot activate an expired or fully redeemed promo code",
      "This code is expired or fully redeemed and cannot be reactivated.",
    );
  }
  const [row] = await db
    .update(schema.promoCodes)
    .set({ active, updatedAt: new Date() })
    .where(eq(schema.promoCodes.id, id))
    .returning();
  if (!row) throw new Error("Failed to toggle promo code");
  return toAdminPromo(row, now);
}

export async function deleteAdminPromo(
  id: string,
  db: Db = getDb(),
): Promise<AdminPromoDeleteResponse> {
  // Archive (deactivate) a redeemed code so its redemption history and any
  // receipts referencing it stay intact; hard-delete a code that was never used.
  // The conditional delete keys on redeemedCount = 0 so a concurrent redemption
  // between the read and the delete can't erase a now-used code.
  const deleted = await db
    .delete(schema.promoCodes)
    .where(and(eq(schema.promoCodes.id, id), eq(schema.promoCodes.redeemedCount, 0)))
    .returning({ id: schema.promoCodes.id });
  if (deleted.length > 0) {
    return { outcome: "hard_deleted", promoId: id };
  }

  const [archived] = await db
    .update(schema.promoCodes)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.promoCodes.id, id))
    .returning({ id: schema.promoCodes.id });
  if (!archived) {
    throw new AppError({
      family: "validation_error",
      statusCode: 404,
      code: "PROMO_NOT_FOUND",
      message: "Promo code not found",
      userMessage: "This promo code no longer exists.",
      userAction: null,
    });
  }
  return { outcome: "archived", promoId: id };
}
