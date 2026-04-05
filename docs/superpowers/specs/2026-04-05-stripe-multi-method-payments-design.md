# Stripe Multi-Method Payment Integration

## Problem

The payment backend uses `capture_method: 'manual'` and a state machine designed only for card-style authorize-then-capture flows. Twint, Apple Pay, and Google Pay are immediate-capture methods that skip the `authorized` state entirely, breaking the current state machine and preventing dispatch from being enqueued.

The PaymentIntent also lacks `automatic_payment_methods`, so Stripe won't surface alternative payment methods in the PaymentElement.

## Decisions

- **Capture strategy:** Accept immediate capture for Twint/wallets. Refund if dispatch fails.
- **Method order:** Twint first, then cards, then wallets (Swiss-optimized).
- **Apple Pay:** Set up nginx domain verification route now; domain registration in Stripe Dashboard is a manual step.

## Changes

### 1. State Machine (`shared/src/state-machines.ts`)

Add `captured` to `pending`'s allowed transitions:

```typescript
[PaymentState.pending]: [
  PaymentState.authorized,
  PaymentState.captured,    // ← NEW: immediate-capture methods (Twint, wallets)
  PaymentState.failed,
  PaymentState.cancelled,
],
```

This reflects reality: Stripe fires `payment_intent.succeeded` directly for Twint/Apple Pay/Google Pay, never passing through `requires_capture`.

### 2. Stripe Adapter (`backend/src/modules/payments/adapters/stripe.adapter.ts`)

Switch to `capture_method: 'automatic'` and add `automatic_payment_methods`:

```typescript
const intent = await getStripe().paymentIntents.create({
  amount: amountCents,
  currency: "chf",
  metadata: { ... },
  automatic_payment_methods: { enabled: true },
});
```

**Critical:** `capture_method: 'manual'` must be REMOVED. Stripe filters out Twint (and other immediate-capture methods) from the PaymentElement when manual capture is set. With automatic capture (the default), all methods are available and `payment_intent.succeeded` is the only capture webhook.

### 3. Webhook Handler (`backend/src/modules/payments/payment.routes.ts`)

With automatic capture, `payment_intent.succeeded` is now the PRIMARY webhook for ALL payment methods. The handler must always enqueue dispatch:

```
Flow (all methods with automatic capture):
  succeeded → captured → enqueue dispatch + send receipt
```

Dispatch enqueue uses BullMQ's deterministic `jobId: dispatch:{paymentId}`, so webhook retries are safe (BullMQ silently deduplicates).

The `amount_capturable_updated` handler is left as a no-op safety net — it won't fire with automatic capture.

### 3b. Dispatch Settlement (`backend/src/workers/dispatch-settlement.ts`)

With automatic capture, payments are captured BEFORE dispatch. If dispatch is rejected:
- `authorized` payment → cancel authorization (unchanged, but no longer the primary path)
- `captured` payment → initiate Stripe refund → transition to `refund_pending`

The settlement worker must be extended to handle `captured + rejected → refund`.

### 4. Frontend PaymentElement (`frontend/src/components/product/StripePaymentForm.tsx`)

Update `paymentMethodOrder` from `["card", "twint"]` to `["twint", "card"]`.

Wallets (Apple Pay, Google Pay) are handled automatically by Stripe based on device/browser capabilities and don't need explicit ordering.

### 5. Apple Pay Domain Verification

Add nginx route to serve the Stripe domain association file:

```nginx
location /.well-known/apple-developer-merchantid-domain-association {
    default_type application/octet-stream;
    alias /etc/nginx/apple-pay/apple-developer-merchantid-domain-association;
}
```

The actual file content is downloaded from the Stripe Dashboard after domain registration. A placeholder file is created for now.

### 6. Environment Variables

No new env vars. Existing placeholders need real values:

```env
STRIPE_SECRET_KEY=sk_test_...                       # Backend
STRIPE_WEBHOOK_SECRET=whsec_...                     # Backend
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...      # Frontend
```

### 7. Tests

- **State machine tests:** Verify `pending → captured` is now allowed
- **Webhook handler test:** Verify immediate-capture path enqueues dispatch + transitions correctly
- **Existing tests:** Verify card authorize-then-capture flow still works unchanged

## What This Does NOT Change

- Checkout page layout and email collection (already correct)
- PriceSummary component (already correct)
- Payment polling hooks (already handle `captured` as terminal state)
- Confirmation page flow (already correct)
- Database schema (no new columns needed)
- Refund flow (unchanged — works regardless of capture method)

## Manual Steps After Implementation

1. Add real Stripe keys to `.env`
2. Enable Twint in Stripe Dashboard (Settings → Payment methods)
3. Enable Apple Pay in Stripe Dashboard and register the domain
4. Enable Google Pay in Stripe Dashboard
5. Set up Stripe webhook endpoint in Dashboard pointing to `https://<domain>/v1/webhooks/stripe`
6. Configure webhook to send: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
