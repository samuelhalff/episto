import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { AppError } from "../../shared/errors/index.js";
import { createSmsProvider } from "./sms-providers/index.js";
import type { SmsProvider } from "./sms-providers/types.js";

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_VERIFICATION = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const CODE_DIGITS = 6;

export function normalizeSwissMobilePhone(input: string): string {
  const compact = input.trim().replace(/[\s().-]/g, "");
  const normalized = compact.startsWith("00")
    ? `+${compact.slice(2)}`
    : compact.startsWith("0")
      ? `+41${compact.slice(1)}`
      : compact;

  if (!/^\+417[5-9]\d{7}$/.test(normalized)) {
    throw new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "PHONE_INVALID",
      message: "Phone verification currently accepts Swiss mobile numbers only.",
      userMessage: "Enter a valid Swiss mobile number.",
      userAction: "Use a number such as +41 79 123 45 67.",
    });
  }

  return normalized;
}

export function generatePhoneVerificationCode(): string {
  const upperBound = 10 ** CODE_DIGITS;
  return String(randomInt(0, upperBound)).padStart(CODE_DIGITS, "0");
}

export function hashPhoneVerificationCode(input: {
  verificationId: string;
  code: string;
  secret: string;
}): string {
  return createHmac("sha256", input.secret)
    .update(`${input.verificationId}:${input.code}`)
    .digest("hex");
}

export function verifyPhoneVerificationCode(input: {
  verificationId: string;
  code: string;
  hash: string;
  secret: string;
}): boolean {
  const expected = hashPhoneVerificationCode(input);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(input.hash, "hex");

  if (expectedBuffer.byteLength !== actualBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function buildPhoneVerificationMessage(code: string): string {
  return `episto code: ${code}. Expires in 10 minutes.`;
}

export function createPhoneVerificationSmsFailureError(cause: unknown): AppError {
  return new AppError({
    family: "provider_outage",
    statusCode: 503,
    code: "PROVIDER_OUTAGE",
    message: "SMS delivery provider is unavailable",
    userMessage: "SMS delivery is temporarily unavailable. Please try again shortly.",
    userAction: "Wait a moment, then request a new SMS code.",
    cause,
  });
}

function getCodeSecret(): string {
  return env().ORDER_ACCESS_TOKEN_SECRET;
}

function getResendAvailableAt(lastSentAt: Date): Date {
  return new Date(lastSentAt.getTime() + RESEND_COOLDOWN_MS);
}

function assertCanResend(row: { sendCount: number; lastSentAt: Date; expiresAt: Date }) {
  const now = new Date();
  if (row.expiresAt <= now) {
    return;
  }

  if (row.sendCount >= MAX_SENDS_PER_VERIFICATION) {
    throw new AppError({
      family: "policy_refusal",
      statusCode: 429,
      code: "PHONE_VERIFICATION_SEND_LIMIT",
      message: "Phone verification send limit reached.",
      userMessage: "Too many SMS codes were sent. Please wait and try again.",
      userAction: "Wait until the current code expires, then request a new one.",
    });
  }

  if (getResendAvailableAt(row.lastSentAt) > now) {
    throw new AppError({
      family: "policy_refusal",
      statusCode: 429,
      code: "PHONE_VERIFICATION_COOLDOWN",
      message: "Phone verification resend cooldown is still active.",
      userMessage: "Please wait before requesting another SMS code.",
      userAction: "Retry after the cooldown has passed.",
    });
  }
}

async function getLatestVerification(
  db: Db,
  input: { sessionId: string; draftId: string },
) {
  const [row] = await db
    .select()
    .from(schema.phoneVerifications)
    .where(
      and(
        eq(schema.phoneVerifications.sessionId, input.sessionId),
        eq(schema.phoneVerifications.draftId, input.draftId),
      ),
    )
    .orderBy(desc(schema.phoneVerifications.createdAt))
    .limit(1);

  return row ?? null;
}

export async function startPhoneVerification(
  db: Db,
  input: {
    sessionId: string;
    draftId: string;
    phone: string;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    smsProvider?: SmsProvider | undefined;
  },
) {
  const phoneE164 = normalizeSwissMobilePhone(input.phone);
  const smsProvider = input.smsProvider ?? createSmsProvider();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_MS);
  const latest = await getLatestVerification(db, input);

  if (latest?.status === "pending" && latest.phoneE164 === phoneE164) {
    assertCanResend(latest);
  }

  const code = generatePhoneVerificationCode();
  const message = buildPhoneVerificationMessage(code);

  const [verification] = await db
    .insert(schema.phoneVerifications)
    .values({
      sessionId: input.sessionId,
      draftId: input.draftId,
      phoneE164,
      codeHash: "pending",
      status: "pending",
      sendCount:
        latest?.status === "pending" && latest.phoneE164 === phoneE164
          ? latest.sendCount + 1
          : 1,
      verifyAttemptCount: 0,
      provider: "pending",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      lastSentAt: now,
      expiresAt,
    })
    .returning();

  if (!verification) {
    throw new Error("Failed to create phone verification.");
  }

  const codeHash = hashPhoneVerificationCode({
    verificationId: verification.id,
    code,
    secret: getCodeSecret(),
  });

  let smsResult: Awaited<ReturnType<SmsProvider["sendSms"]>>;
  try {
    smsResult = await smsProvider.sendSms({ toE164: phoneE164, message });
  } catch (err) {
    await db
      .delete(schema.phoneVerifications)
      .where(eq(schema.phoneVerifications.id, verification.id));
    throw createPhoneVerificationSmsFailureError(err);
  }

  try {
    await db
      .update(schema.phoneVerifications)
      .set({
        codeHash,
        provider: smsResult.provider,
        providerMessageId: smsResult.providerMessageId,
        updatedAt: new Date(),
      })
      .where(eq(schema.phoneVerifications.id, verification.id));
  } catch (err) {
    await db
      .delete(schema.phoneVerifications)
      .where(eq(schema.phoneVerifications.id, verification.id));
    throw err;
  }

  return {
    status: "pending" as const,
    phoneE164,
    expiresAt,
    resendAvailableAt: getResendAvailableAt(now),
  };
}

export async function confirmPhoneVerification(
  db: Db,
  input: { sessionId: string; draftId: string; code: string },
) {
  const latest = await getLatestVerification(db, input);
  const now = new Date();

  if (!latest || latest.status !== "pending") {
    throw new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "PHONE_VERIFICATION_NOT_FOUND",
      message: "No pending phone verification exists for this draft.",
      userMessage: "Request a new SMS code before continuing.",
      userAction: "Send a new code.",
    });
  }

  if (latest.expiresAt <= now) {
    await db
      .update(schema.phoneVerifications)
      .set({ status: "expired", updatedAt: now })
      .where(eq(schema.phoneVerifications.id, latest.id));
    throw new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "PHONE_VERIFICATION_EXPIRED",
      message: "Phone verification code expired.",
      userMessage: "The SMS code has expired.",
      userAction: "Send a new code.",
    });
  }

  if (latest.verifyAttemptCount >= MAX_VERIFY_ATTEMPTS) {
    throw new AppError({
      family: "policy_refusal",
      statusCode: 429,
      code: "PHONE_VERIFICATION_ATTEMPT_LIMIT",
      message: "Phone verification attempt limit reached.",
      userMessage: "Too many incorrect codes were entered.",
      userAction: "Send a new code and try again.",
    });
  }

  const code = input.code.trim();
  const isValid =
    /^\d{6}$/.test(code) &&
    verifyPhoneVerificationCode({
      verificationId: latest.id,
      code,
      hash: latest.codeHash,
      secret: getCodeSecret(),
    });

  if (!isValid) {
    const nextAttemptCount = latest.verifyAttemptCount + 1;
    await db
      .update(schema.phoneVerifications)
      .set({
        verifyAttemptCount: nextAttemptCount,
        status: nextAttemptCount >= MAX_VERIFY_ATTEMPTS ? "failed" : "pending",
        updatedAt: now,
      })
      .where(eq(schema.phoneVerifications.id, latest.id));

    throw new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "PHONE_VERIFICATION_CODE_INVALID",
      message: "Invalid phone verification code.",
      userMessage: "The SMS code is not correct.",
      userAction: "Check the code and try again.",
    });
  }

  await db
    .update(schema.phoneVerifications)
    .set({ status: "verified", verifiedAt: now, updatedAt: now })
    .where(eq(schema.phoneVerifications.id, latest.id));

  await db
    .update(schema.sessions)
    .set({
      phoneE164: latest.phoneE164,
      phoneVerifiedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.sessions.id, input.sessionId));

  return {
    status: "verified" as const,
    phoneE164: latest.phoneE164,
    verifiedAt: now,
  };
}

export async function assertVerifiedPhoneForCheckout(
  db: Db,
  input: { sessionId: string },
): Promise<{ phoneE164: string; phoneVerifiedAt: Date }> {
  const [row] = await db
    .select({
      phoneE164: schema.sessions.phoneE164,
      phoneVerifiedAt: schema.sessions.phoneVerifiedAt,
    })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, input.sessionId))
    .limit(1);

  if (!row?.phoneE164 || !row.phoneVerifiedAt) {
    throw new AppError({
      family: "policy_refusal",
      statusCode: 409,
      code: "PHONE_VERIFICATION_REQUIRED",
      message: "Checkout requires a verified phone number.",
      userMessage: "Verify your mobile number before payment.",
      userAction: "Enter your phone number and confirm the SMS code.",
    });
  }

  return {
    phoneE164: row.phoneE164,
    phoneVerifiedAt: row.phoneVerifiedAt,
  };
}

export async function getPhoneVerificationStatus(
  db: Db,
  input: { sessionId: string },
): Promise<
  | { status: "verified"; phoneE164: string; phoneVerifiedAt: Date }
  | { status: "unverified"; phoneE164: null; phoneVerifiedAt: null }
> {
  const [row] = await db
    .select({
      phoneE164: schema.sessions.phoneE164,
      phoneVerifiedAt: schema.sessions.phoneVerifiedAt,
    })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, input.sessionId))
    .limit(1);

  if (row?.phoneE164 && row.phoneVerifiedAt) {
    return {
      status: "verified",
      phoneE164: row.phoneE164,
      phoneVerifiedAt: row.phoneVerifiedAt,
    };
  }

  return { status: "unverified", phoneE164: null, phoneVerifiedAt: null };
}
