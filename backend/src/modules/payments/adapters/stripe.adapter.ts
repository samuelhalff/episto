import Stripe from "stripe";
import { env } from "../../../shared/config/index.js";
import { AppError, providerOutageError } from "../../../shared/errors/index.js";

// ---------------------------------------------------------------------------
// Singleton Stripe client
// ---------------------------------------------------------------------------

let _stripe: Stripe | undefined;

function isPlaceholderStripeValue(value: string): boolean {
  return /replace_me|placeholder/i.test(value);
}

function createStripeNotConfiguredError(message: string, cause?: unknown): AppError {
  return new AppError({
    family: "provider_outage",
    statusCode: 503,
    code: "STRIPE_NOT_CONFIGURED",
    message,
    userMessage: "Payment is unavailable in this environment.",
    userAction: "Configure Stripe before using checkout here.",
    cause,
  });
}

function assertStripeSecretConfigured(): void {
  const secretKey = env().STRIPE_SECRET_KEY;
  if (isPlaceholderStripeValue(secretKey)) {
    throw createStripeNotConfiguredError(
      "Stripe secret key is still using a placeholder value.",
    );
  }
}

function assertStripeWebhookConfigured(): void {
  const webhookSecret = env().STRIPE_WEBHOOK_SECRET;
  if (isPlaceholderStripeValue(webhookSecret)) {
    throw createStripeNotConfiguredError(
      "Stripe webhook secret is still using a placeholder value.",
    );
  }
}

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  assertStripeSecretConfigured();
  _stripe = new Stripe(env().STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
  return _stripe;
}

// ---------------------------------------------------------------------------
// Create PaymentIntent
// ---------------------------------------------------------------------------

export async function createPaymentIntent(
  amountCents: number,
  metadata: { draftId: string; sessionId: string; paymentAttemptId: string },
): Promise<{ paymentIntentId: string; clientSecret: string }> {
  try {
    const intent = await getStripe().paymentIntents.create({
      amount: amountCents,
      currency: "chf",
      metadata: {
        draftId: metadata.draftId,
        sessionId: metadata.sessionId,
        paymentAttemptId: metadata.paymentAttemptId,
      },
      // Automatic capture is required to support Twint and other immediate-capture
      // methods. Stripe filters out Twint when capture_method is set to non-automatic.
      // All methods now go pending → captured via payment_intent.succeeded.
      automatic_payment_methods: { enabled: true },
    });

    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client_secret");
    }

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof Stripe.errors.StripeError) {
      throw mapStripeError(err);
    }
    throw providerOutageError("Stripe", err);
  }
}

export async function getPaymentIntentClientSecret(
  paymentIntentId: string,
): Promise<string | null> {
  try {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    return intent.client_secret ?? null;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof Stripe.errors.StripeError) {
      throw mapStripeError(err);
    }
    throw providerOutageError("Stripe", err);
  }
}

// ---------------------------------------------------------------------------
// Capture PaymentIntent
// ---------------------------------------------------------------------------

export async function capturePaymentIntent(
  paymentIntentId: string,
): Promise<{ chargeId: string | null }> {
  try {
    const intent = await getStripe().paymentIntents.capture(paymentIntentId);
    const chargeId = intent.latest_charge;
    return {
      chargeId: typeof chargeId === "string" ? chargeId : null,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof Stripe.errors.StripeError) {
      throw mapStripeError(err);
    }
    throw providerOutageError("Stripe", err);
  }
}

// ---------------------------------------------------------------------------
// Cancel PaymentIntent
// ---------------------------------------------------------------------------

export async function cancelPaymentIntent(paymentIntentId: string): Promise<void> {
  try {
    await getStripe().paymentIntents.cancel(paymentIntentId);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof Stripe.errors.StripeError) {
      throw mapStripeError(err);
    }
    throw providerOutageError("Stripe", err);
  }
}

// ---------------------------------------------------------------------------
// Create Refund
// ---------------------------------------------------------------------------

export async function createRefund(
  paymentIntentId: string,
  reason: string,
): Promise<{ refundId: string }> {
  try {
    const refund = await getStripe().refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
      metadata: { admin_reason: reason },
    });
    return { refundId: refund.id };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    if (err instanceof Stripe.errors.StripeError) {
      throw mapStripeError(err);
    }
    throw providerOutageError("Stripe", err);
  }
}

// ---------------------------------------------------------------------------
// Construct webhook event (verify signature)
// ---------------------------------------------------------------------------

export function constructWebhookEvent(
  body: string | Buffer,
  signature: string,
): Stripe.Event {
  try {
    assertStripeWebhookConfigured();
    return getStripe().webhooks.constructEvent(
      body,
      signature,
      env().STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "WEBHOOK_SIGNATURE_INVALID",
      message: err instanceof Error ? err.message : "Invalid webhook signature",
      userMessage: "Webhook verification failed.",
      userAction: null,
    });
  }
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function mapStripeError(err: Stripe.errors.StripeError): AppError {
  switch (err.type) {
    case "StripeAuthenticationError":
      return createStripeNotConfiguredError(err.message, err);

    case "StripeCardError":
      return new AppError({
        family: "payment_failure",
        statusCode: 402,
        code: "CARD_ERROR",
        message: err.message,
        userMessage: err.message,
        userAction: "Please check your card details and try again.",
      });

    case "StripeInvalidRequestError":
      return new AppError({
        family: "payment_failure",
        statusCode: 400,
        code: "PAYMENT_INVALID_REQUEST",
        message: err.message,
        userMessage: "The payment request was invalid.",
        userAction: "Please try again or use a different payment method.",
      });

    default:
      return new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "STRIPE_ERROR",
        message: err.message,
        userMessage: "Payment processing is temporarily unavailable.",
        userAction: "Wait a moment and retry.",
        cause: err,
      });
  }
}
