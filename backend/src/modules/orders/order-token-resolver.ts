import { eq } from "drizzle-orm";

import { schema } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import { hashResumeToken } from "../sessions/session.service.js";
import {
  orderAccessGeneration,
  OrderAccessTokenExpiredError,
  OrderAccessTokenVerificationError,
  verifyOrderAccessToken,
} from "./order-access-token.js";

async function findActivePaymentById(
  db: Db,
  paymentAttemptId: string,
  generation: string,
) {
  const [payment] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, paymentAttemptId))
    .limit(1);

  if (!payment) return null;
  if (!payment.orderAccessTokenExpiresAt) return null;
  if (payment.orderAccessTokenExpiresAt < new Date()) return null;
  // The signed token is stateless, so this comparison is the only thing that
  // can withdraw one before it ages out. Rotating the order's access token
  // moves the generation on, and every link issued against the previous one
  // stops here rather than opening the order.
  if (!payment.orderAccessTokenHash) return null;
  if (orderAccessGeneration(payment.orderAccessTokenHash) !== generation) return null;
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

type SignedTokenResolution =
  | { kind: "verified"; paymentAttemptId: string; generation: string }
  | { kind: "expired" }
  | { kind: "fallback" };

async function resolveSignedToken(orderToken: string): Promise<SignedTokenResolution> {
  try {
    const claims = await verifyOrderAccessToken(orderToken);
    return {
      kind: "verified",
      paymentAttemptId: claims.paymentAttemptId,
      generation: claims.generation,
    };
  } catch (error) {
    if (error instanceof OrderAccessTokenExpiredError) {
      return { kind: "expired" };
    }

    if (error instanceof OrderAccessTokenVerificationError) {
      return { kind: "fallback" };
    }

    throw error;
  }
}

export async function resolveOrderAccessPayment(db: Db, orderToken: string) {
  const signedToken = await resolveSignedToken(orderToken);

  if (signedToken.kind === "verified") {
    return findActivePaymentById(
      db,
      signedToken.paymentAttemptId,
      signedToken.generation,
    );
  }

  if (signedToken.kind === "expired") {
    return null;
  }

  return findActivePaymentByTokenHash(db, orderToken);
}
