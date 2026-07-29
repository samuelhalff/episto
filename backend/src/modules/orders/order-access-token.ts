import { createHash, webcrypto } from "node:crypto";

import { errors, SignJWT, jwtVerify } from "jose";

import { env } from "../../shared/config/index.js";

const ORDER_ACCESS_AUDIENCE = "order-access";
const ORDER_ACCESS_ISSUER = "episto";
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

/**
 * The generation marker carried by a signed link.
 *
 * A signed token is stateless: it names a payment attempt and a expiry, and
 * nothing else. That made it impossible to withdraw one — a link that had been
 * forwarded, or sat in a mailbox that later fell into the wrong hands, stayed
 * good until it aged out weeks later. Binding the token to the order's current
 * access-token hash fixes that without a second store: replacing the hash
 * replaces the generation, and every link issued against the old one stops
 * resolving at once.
 *
 * Hashed again rather than used directly, for two reasons. The claim travels
 * inside a signed token, which is base64 and therefore readable by anyone
 * holding the link; publishing the stored hash verbatim gives away more than
 * the link already does. And 32 hex characters is 128 bits, where an earlier
 * 16-character prefix of the hash was only 64 — enough that a future rotation
 * colliding with a historical generation, and quietly resurrecting a revoked
 * link, stops being a number worth thinking about.
 */
export function orderAccessGeneration(tokenHash: string): string {
  return createHash("sha256")
    .update(`order-access-gen:${tokenHash}`)
    .digest("hex")
    .slice(0, 32);
}

export async function issueOrderAccessToken(args: {
  paymentAttemptId: string;
  expiresAt: Date;
  tokenHash: string;
}): Promise<string> {
  return new SignJWT({ gen: orderAccessGeneration(args.tokenHash) })
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
  generation: string;
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

  // A token without a generation claim cannot be revoked, so it is not accepted
  // at all: tolerating it would leave a class of link that survives the very
  // action a customer took to withdraw it. Links minted before this claim
  // existed stop working, which is why "email me my link again" exists.
  if (
    typeof payload.sub !== "string" ||
    typeof payload.exp !== "number" ||
    typeof payload.gen !== "string"
  ) {
    throw new OrderAccessTokenVerificationError(
      "Signed order access token payload is invalid",
    );
  }

  return {
    paymentAttemptId: payload.sub,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    generation: payload.gen,
  };
}
