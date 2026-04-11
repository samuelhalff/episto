import { errors } from "jose";
import { eq } from "drizzle-orm";

import { schema } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import { hashResumeToken } from "../sessions/session.service.js";
import { verifyOrderAccessToken } from "./order-access-token.js";

function isResolvableOrderAccessTokenError(error: unknown): boolean {
  return (
    error instanceof errors.JOSEError ||
    (error instanceof Error &&
      (/^JWT\b/i.test(error.message) ||
        error.message === "Invalid signed order access token payload"))
  );
}

async function findActivePaymentById(db: Db, paymentAttemptId: string) {
  const [payment] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, paymentAttemptId))
    .limit(1);

  if (!payment) return null;
  if (!payment.orderAccessTokenExpiresAt) return null;
  if (payment.orderAccessTokenExpiresAt < new Date()) return null;
  return payment;
}

async function findActivePaymentByTokenHash(db: Db, orderToken: string) {
  const [payment] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.orderAccessTokenHash, hashResumeToken(orderToken)))
    .limit(1);

  if (!payment) return null;
  if (!payment.orderAccessTokenExpiresAt) return null;
  if (payment.orderAccessTokenExpiresAt < new Date()) return null;
  return payment;
}

async function resolveSignedPaymentAttemptId(orderToken: string): Promise<string | null> {
  try {
    const claims = await verifyOrderAccessToken(orderToken);
    return claims.paymentAttemptId;
  } catch (error) {
    if (isResolvableOrderAccessTokenError(error)) {
      return null;
    }

    throw error;
  }
}

export async function resolveOrderAccessPayment(db: Db, orderToken: string) {
  const paymentAttemptId = await resolveSignedPaymentAttemptId(orderToken);

  if (paymentAttemptId) {
    return findActivePaymentById(db, paymentAttemptId);
  }

  return findActivePaymentByTokenHash(db, orderToken);
}
