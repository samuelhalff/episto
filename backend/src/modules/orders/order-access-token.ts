import { webcrypto } from "node:crypto";

import { errors, SignJWT, jwtVerify } from "jose";

import { env } from "../../shared/config/index.js";

const ORDER_ACCESS_AUDIENCE = "order-access";
const ORDER_ACCESS_ISSUER = "swiss-mail";
const encoder = new TextEncoder();

export class OrderAccessTokenExpiredError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Signed order access token expired", options);
    this.name = "OrderAccessTokenExpiredError";
  }
}

export class OrderAccessTokenVerificationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OrderAccessTokenVerificationError";
  }
}

// Vitest's Node environment may not expose Web Crypto; jose requires it.
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

function getOrderAccessKey(): Uint8Array {
  return encoder.encode(env().ORDER_ACCESS_TOKEN_SECRET);
}

export async function issueOrderAccessToken(args: {
  paymentAttemptId: string;
  expiresAt: Date;
}): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(args.paymentAttemptId)
    .setAudience(ORDER_ACCESS_AUDIENCE)
    .setIssuer(ORDER_ACCESS_ISSUER)
    .setExpirationTime(Math.floor(args.expiresAt.getTime() / 1000))
    .sign(getOrderAccessKey());
}

export async function verifyOrderAccessToken(token: string): Promise<{
  paymentAttemptId: string;
  expiresAt: string;
}> {
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    ({ payload } = await jwtVerify(token, getOrderAccessKey(), {
      audience: ORDER_ACCESS_AUDIENCE,
      issuer: ORDER_ACCESS_ISSUER,
    }));
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new OrderAccessTokenExpiredError({ cause: error });
    }

    if (error instanceof errors.JOSEError) {
      throw new OrderAccessTokenVerificationError(
        "Signed order access token verification failed",
        { cause: error },
      );
    }

    throw error;
  }

  if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
    throw new OrderAccessTokenVerificationError(
      "Signed order access token payload is invalid",
    );
  }

  return {
    paymentAttemptId: payload.sub,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}
