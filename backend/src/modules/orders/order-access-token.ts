import { webcrypto } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import { env } from "../../shared/config/index.js";

const ORDER_ACCESS_AUDIENCE = "order-access";
const ORDER_ACCESS_ISSUER = "swiss-mail";
const encoder = new TextEncoder();

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
    if (
      error instanceof Error &&
      (error.message.includes('"exp" claim timestamp check failed') ||
        error.message.toLowerCase().includes("expired"))
    ) {
      throw new Error("JWT expired");
    }

    throw error;
  }

  if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
    throw new Error("Invalid signed order access token payload");
  }

  return {
    paymentAttemptId: payload.sub,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}
