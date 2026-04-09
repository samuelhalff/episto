import { env } from "../../shared/config/index.js";

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function getOrderIssuedAt(orderAccessExpiresAt: Date | null): Date | null {
  if (!orderAccessExpiresAt) {
    return null;
  }

  return addDays(orderAccessExpiresAt, -env().ORDER_ACCESS_DAYS);
}

export function getStatementAvailableUntil(
  orderAccessExpiresAt: Date | null,
): Date | null {
  const issuedAt = getOrderIssuedAt(orderAccessExpiresAt);
  if (!issuedAt) {
    return null;
  }

  return addDays(issuedAt, env().STATEMENT_RETENTION_DAYS);
}

export function isStatementWithinRetentionWindow(
  orderAccessExpiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  const availableUntil = getStatementAvailableUntil(orderAccessExpiresAt);
  if (!availableUntil) {
    return false;
  }

  return now <= availableUntil;
}
