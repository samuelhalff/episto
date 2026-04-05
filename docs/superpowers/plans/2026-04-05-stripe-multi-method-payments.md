# Stripe Multi-Method Payment Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Twint, Apple Pay, Google Pay, and standard card payments through Stripe's PaymentElement by switching to automatic capture and fixing the state machine, webhook handler, and dispatch settlement for the new flow.

**Architecture:** The payment system is already built (adapter, routes, webhooks, frontend). The critical fix is switching `capture_method` from `'manual'` to `'automatic'` — Stripe filters out TWINT (and other non-card methods) when manual capture is set, because TWINT does not support separate authorization and capture. With automatic capture, ALL payment methods fire `payment_intent.succeeded` directly, so the webhook handler and dispatch settlement must be updated accordingly. When dispatch is rejected after capture, the settlement worker triggers a refund instead of voiding an authorization.

**Tech Stack:** Stripe Node.js SDK, @stripe/react-stripe-js, Vitest, nginx

**Baseline:** 1019 tests pass, 3 pre-existing failures (DraftShell prop mismatch — unrelated), 5 skipped. Lint has pre-existing errors. Do not regress.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `docs/05-architecture/system-contracts.md` | Modify | Update payment state machine for automatic capture + add `pending → captured` |
| `shared/src/state-machines.ts` | Modify | Add `PaymentState.captured` to `pending` transitions |
| `shared/tests/state-machines.test.ts` | Modify | Flip `pending → captured` test; add immediate-capture path test |
| `backend/src/modules/payments/adapters/stripe.adapter.ts` | Modify | Switch to `capture_method: 'automatic'`, add `automatic_payment_methods` |
| `backend/src/modules/payments/payment.routes.ts` | Modify | Rework `payment_intent.succeeded` to always enqueue dispatch; add `getLatestSnapshot` import |
| `backend/src/workers/dispatch-settlement.ts` | Modify | Handle `captured` + `rejected` → trigger refund |
| `backend/tests/stripe-config.test.ts` | Modify | Add tests for automatic capture + automatic_payment_methods |
| `backend/tests/immediate-capture-webhook.test.ts` | Create | Test that succeeded handler enqueues dispatch and sends receipt |
| `backend/tests/dispatch-settlement.test.ts` | Modify | Add test for rejected dispatch with pre-captured payment → refund |
| `frontend/src/components/product/StripePaymentForm.tsx` | Modify | Reorder `paymentMethodOrder` to `["twint", "card"]` |
| `frontend/tests/checkout.test.ts` | Modify | Add test for Twint-first payment method ordering |
| `nginx/nginx.conf` | Modify | Add `.well-known/apple-developer-merchantid-domain-association` location |
| `nginx/ark-fid-proxy.conf` | Modify | Same Apple Pay location for dev proxy |

---

### Task 1: Update Payment State Machine Docs

**Files:**
- Modify: `docs/05-architecture/system-contracts.md:150-179`

- [ ] **Step 1: Update the payment state machine diagram**

In `docs/05-architecture/system-contracts.md`, replace the payment state machine block (lines 153-173) with:

```
One `PaymentAttempt` row per Stripe payment intent.

```
pending
  → authorized         (Stripe auth hold — card with manual capture only)
  → captured           (automatic capture — Twint, Apple Pay, Google Pay, or cards with automatic capture)
  → failed             (terminal: Stripe declined immediately)
  → cancelled          (user abandoned or intent expired)

authorized
  → captured           (capture confirmed after deterministic dispatch acceptance)
  → cancelled          (void before capture)
  → failed             (terminal: capture failed after auth)

captured
  → refund_pending     (refund requested — e.g. dispatch rejected after capture)

refund_pending
  → refunded           (terminal: full refund confirmed)
  → partially_refunded (terminal: partial refund confirmed)

[any]
  → failed             (unrecoverable Stripe error)
```
```

- [ ] **Step 2: Update the rules section**

Replace lines 175-179 with:

```
**Rules:**
- Payment truth comes from Stripe webhooks normalized by the payment adapter.
- Frontend never decides payment state — it reads backend responses only.
- `authorized` and `captured` are distinct states. Do not collapse them.
- With `capture_method: 'automatic'`, all payment methods go `pending → captured` directly. The `authorized` state is only used if a future flow re-enables manual capture for cards.
- Immediate-capture payments (Twint, wallets, and cards with automatic capture) trigger dispatch on `payment_intent.succeeded`. If dispatch is later rejected, the settlement worker initiates a refund.
- Dispatch submission is triggered by payment capture — either via the `payment_intent.succeeded` webhook (automatic capture) or via the `payment_intent.amount_capturable_updated` webhook (manual capture, if enabled).
```

- [ ] **Step 3: Commit**

```bash
git add docs/05-architecture/system-contracts.md
git commit -m "docs: update payment state machine for automatic capture flow

Switch from manual to automatic capture to support Twint, Apple Pay,
and Google Pay. All methods now go pending → captured directly.
Rejected dispatch triggers refund instead of voiding authorization.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Update State Machine Code and Tests (TDD)

**Files:**
- Modify: `shared/src/state-machines.ts:35-39`
- Modify: `shared/tests/state-machines.test.ts:138-139`

- [ ] **Step 1: Update the existing test and add new tests**

In `shared/tests/state-machines.test.ts`, replace the test at lines 138-139:

```typescript
  it("rejects pending → captured (skip)", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.captured)).toBe(false);
  });
```

With these tests:

```typescript
  it("allows pending → captured (automatic capture: Twint, Apple Pay, Google Pay)", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.captured)).toBe(true);
  });

  it("allows the full automatic-capture flow: pending → captured → refund_pending → refunded", () => {
    expect(canTransitionPayment(PaymentState.pending, PaymentState.captured)).toBe(true);
    expect(canTransitionPayment(PaymentState.captured, PaymentState.refund_pending)).toBe(true);
    expect(canTransitionPayment(PaymentState.refund_pending, PaymentState.refunded)).toBe(true);
  });
```

- [ ] **Step 2: Run the tests — expect failure**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run shared/tests/state-machines.test.ts`
Expected: FAIL — `canTransitionPayment(pending, captured)` returns `false`

- [ ] **Step 3: Update the state machine to allow `pending → captured`**

In `shared/src/state-machines.ts`, update the `pending` entry (lines 35-39):

```typescript
  [PaymentState.pending]: [
    PaymentState.authorized,
    PaymentState.captured,
    PaymentState.failed,
    PaymentState.cancelled,
  ],
```

- [ ] **Step 4: Run the tests — expect pass**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run shared/tests/state-machines.test.ts`
Expected: PASS — all payment state machine tests green

- [ ] **Step 5: Commit**

```bash
git add shared/src/state-machines.ts shared/tests/state-machines.test.ts
git commit -m "feat: allow pending → captured for automatic-capture payment methods

Twint, Apple Pay, Google Pay (and cards with automatic capture)
fire payment_intent.succeeded directly from pending. The state
machine must permit the pending → captured transition.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Switch Stripe Adapter to Automatic Capture

**Files:**
- Modify: `backend/src/modules/payments/adapters/stripe.adapter.ts:63-72`
- Modify: `backend/tests/stripe-config.test.ts`

- [ ] **Step 1: Write tests for the new adapter configuration**

In `backend/tests/stripe-config.test.ts`, add after existing tests:

```typescript
describe("createPaymentIntent configuration", () => {
  const adapterSource = readFileSync(
    new URL("../src/modules/payments/adapters/stripe.adapter.ts", import.meta.url),
    "utf-8",
  );

  it("uses automatic_payment_methods so Stripe surfaces Twint and wallets", () => {
    expect(adapterSource).toContain("automatic_payment_methods");
    expect(adapterSource).toContain("enabled: true");
  });

  it("does not use manual capture (incompatible with Twint)", () => {
    // Stripe filters out Twint when capture_method is 'manual'.
    // We must NOT have capture_method: "manual" in the PaymentIntent creation.
    const createBlock = adapterSource.split("paymentIntents.create")[1]?.split(");")[0] ?? "";
    expect(createBlock).not.toContain('"manual"');
    expect(createBlock).not.toContain("'manual'");
  });
});
```

Add this import at the top if not already present:

```typescript
import { readFileSync } from "fs";
```

- [ ] **Step 2: Run the test — expect failure**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run backend/tests/stripe-config.test.ts`
Expected: FAIL — adapter still has `capture_method: "manual"` and no `automatic_payment_methods`

- [ ] **Step 3: Update `createPaymentIntent` in the Stripe adapter**

In `backend/src/modules/payments/adapters/stripe.adapter.ts`, replace the `paymentIntents.create` call (lines 64-72):

```typescript
    const intent = await getStripe().paymentIntents.create({
      amount: amountCents,
      currency: "chf",
      metadata: {
        draftId: metadata.draftId,
        sessionId: metadata.sessionId,
        paymentAttemptId: metadata.paymentAttemptId,
      },
      // Automatic capture is required to support Twint and other immediate-capture
      // methods. Stripe filters out Twint when capture_method is 'manual'.
      // All methods now go pending → captured via payment_intent.succeeded.
      automatic_payment_methods: { enabled: true },
    });
```

Note: We remove `capture_method: "manual"` entirely (Stripe defaults to `'automatic'`). This is required because Stripe does NOT surface Twint in the PaymentElement when `capture_method: 'manual'` is set.

- [ ] **Step 4: Run the test — expect pass**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run backend/tests/stripe-config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/payments/adapters/stripe.adapter.ts backend/tests/stripe-config.test.ts
git commit -m "feat: switch to automatic capture and enable automatic_payment_methods

Stripe filters out Twint when capture_method is 'manual'. Switching
to automatic capture (the default) enables Twint, Apple Pay, Google
Pay, and all other Dashboard-enabled methods. All payments now go
directly to captured via payment_intent.succeeded.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Update Webhook Handler for Automatic Capture

**Files:**
- Modify: `backend/src/modules/payments/payment.routes.ts:96-136`
- Create: `backend/tests/immediate-capture-webhook.test.ts`

- [ ] **Step 1: Write tests for the updated succeeded handler**

Create `backend/tests/immediate-capture-webhook.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("payment_intent.succeeded webhook handler", () => {
  const routesSource = readFileSync(
    new URL("../src/modules/payments/payment.routes.ts", import.meta.url),
    "utf-8",
  );

  // Extract the succeeded handler block for targeted assertions
  const succeededBlock = routesSource.split('"payment_intent.succeeded"')[1]?.split("case ")[0] ?? "";

  it("enqueues dispatch submission on capture", () => {
    // With automatic capture, payment_intent.succeeded is the primary webhook.
    // The handler must enqueue dispatch for every successful payment.
    expect(succeededBlock).toContain("enqueueDispatchSubmission");
  });

  it("sends receipt email on capture", () => {
    expect(succeededBlock).toContain("enqueuePaymentReceiptEmail");
  });

  it("retrieves the latest snapshot for dispatch", () => {
    expect(succeededBlock).toContain("getLatestSnapshot");
  });

  it("transitions payment to captured state", () => {
    expect(succeededBlock).toContain('"captured"');
  });
});
```

- [ ] **Step 2: Run the test — expect failure**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run backend/tests/immediate-capture-webhook.test.ts`
Expected: FAIL — current succeeded handler doesn't call `enqueueDispatchSubmission` or `getLatestSnapshot`

- [ ] **Step 3: Update the `payment_intent.succeeded` webhook handler**

In `backend/src/modules/payments/payment.routes.ts`, replace the `case "payment_intent.succeeded"` block (lines 96-136) with:

```typescript
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const draftId = intent.metadata?.draftId;
        const paymentAttemptId = intent.metadata?.paymentAttemptId;
        if (!draftId || !paymentAttemptId) break;

        const db = getDb();
        const payment = await getPaymentForDraft(db, draftId);
        if (!payment || payment.id !== paymentAttemptId) break;

        const chargeId =
          typeof intent.latest_charge === "string" ? intent.latest_charge : null;

        const { rawOrderAccessToken } = await transitionPaymentState(
          db,
          payment.id,
          "captured",
          {
            stripeChargeId: chargeId ?? undefined,
          },
        );

        // Enqueue dispatch — with automatic capture this is the primary trigger.
        // BullMQ deduplicates by jobId (dispatch:{paymentId}), so webhook retries
        // and race conditions with render-pdf worker are safe.
        const snapshot = await getLatestSnapshot(db, draftId);
        if (snapshot?.renderedPdfAssetId) {
          await enqueueDispatchSubmission({
            draftId,
            snapshotId: snapshot.id,
            paymentId: payment.id,
          });
        }

        recordEvent({
          event: "payment_captured",
          draftId,
          paymentAttemptId: payment.id,
          amountCents: payment.amountCents,
        });

        if (rawOrderAccessToken) {
          void (async () => {
            try {
              await enqueuePaymentReceiptEmail(db, payment, rawOrderAccessToken);
            } catch (err) {
              request.log.error({ err }, "Failed to enqueue payment receipt email");
            }
          })();
        }
        break;
      }
```

This replaces the old handler which only transitioned to `captured` and sent receipts. Now it ALSO enqueues dispatch, since with automatic capture `payment_intent.succeeded` is the only capture webhook that fires.

The `amount_capturable_updated` handler (lines 71-93) is left in place as a no-op safety net — it will never fire with automatic capture, but won't cause harm if it does.

- [ ] **Step 4: Run the test — expect pass**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run backend/tests/immediate-capture-webhook.test.ts`
Expected: PASS

- [ ] **Step 5: Run related tests to check for regressions**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run backend/tests/stripe-config.test.ts backend/tests/csrf.test.ts`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/payments/payment.routes.ts backend/tests/immediate-capture-webhook.test.ts
git commit -m "feat: enqueue dispatch from payment_intent.succeeded webhook

With automatic capture, payment_intent.succeeded is the primary
webhook for all payment methods. The handler now enqueues dispatch
submission (previously only done by amount_capturable_updated for
manual-capture cards). BullMQ jobId deduplication ensures safety.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Handle Rejected Dispatch for Pre-Captured Payments

**Files:**
- Modify: `backend/src/workers/dispatch-settlement.ts:49-84`
- Modify: `backend/tests/dispatch-settlement.test.ts`

- [ ] **Step 1: Write a test for rejected dispatch with captured payment**

In `backend/tests/dispatch-settlement.test.ts`, read the file first to understand the existing test structure, then add a new test:

```typescript
  it("initiates refund when dispatch is rejected and payment is already captured", async () => {
    // With automatic capture, payments are captured before dispatch.
    // If dispatch is rejected, the settlement worker must refund.
    const settlementSource = readFileSync(
      new URL("../src/workers/dispatch-settlement.ts", import.meta.url),
      "utf-8",
    );

    // The settlement function must handle captured + rejected → refund
    expect(settlementSource).toContain("refund_pending");
    // It must call createRefund from the Stripe adapter
    expect(settlementSource).toContain("createRefund");
  });
```

Add this import at the top if not present:

```typescript
import { readFileSync } from "fs";
```

- [ ] **Step 2: Run the test — expect failure**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run backend/tests/dispatch-settlement.test.ts`
Expected: FAIL — settlement doesn't handle `captured` + `rejected`

- [ ] **Step 3: Update `settlePaymentForDispatchResolution`**

In `backend/src/workers/dispatch-settlement.ts`, add the `createRefund` import at the top:

```typescript
import {
  cancelPaymentIntent,
  capturePaymentIntent,
  createRefund,
} from "../modules/payments/adapters/stripe.adapter.js";
```

Then replace the function body of `settlePaymentForDispatchResolution` (lines 49-84):

```typescript
export async function settlePaymentForDispatchResolution(
  db: Db,
  draftId: string,
  paymentAttemptId: string | null,
  resolvedState: ResolvedDispatchState,
): Promise<DispatchPaymentSettlementResult> {
  const payment = await getExactPaymentForDispatch(db, draftId, paymentAttemptId);
  if (!payment) {
    return { payment: null, rawOrderAccessToken: null };
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error(
      `Payment ${payment.id} is missing a Stripe PaymentIntent id`,
    );
  }

  // --- Authorized state (manual-capture card flow, if ever re-enabled) ---
  if (payment.state === "authorized") {
    if (resolvedState === "accepted") {
      const capture = await capturePaymentIntent(payment.stripePaymentIntentId);
      return transitionPaymentState(db, payment.id, "captured", {
        stripeChargeId: capture.chargeId ?? undefined,
      });
    }

    await cancelPaymentIntent(payment.stripePaymentIntentId);
    const result: TransitionPaymentResult = await transitionPaymentState(
      db,
      payment.id,
      "cancelled",
    );
    return result;
  }

  // --- Captured state (automatic-capture: Twint, wallets, cards) ---
  if (payment.state === "captured") {
    if (resolvedState === "accepted") {
      // Already captured — nothing to do for payment, just return.
      return { payment, rawOrderAccessToken: null };
    }

    // Dispatch rejected after capture → initiate refund.
    await createRefund(
      payment.stripePaymentIntentId,
      `Dispatch rejected for draft ${draftId}`,
    );
    const result = await transitionPaymentState(
      db,
      payment.id,
      "refund_pending",
      { refundReason: `Dispatch rejected for draft ${draftId}` },
    );
    return result;
  }

  // Other states (pending, failed, cancelled, etc.) — no settlement action
  return { payment, rawOrderAccessToken: null };
}
```

- [ ] **Step 4: Update `updateDraftStatusForDispatchResolution` to handle refund_pending**

In the same file, update `updateDraftStatusForDispatchResolution` (lines 101-127):

```typescript
export async function updateDraftStatusForDispatchResolution(
  db: Db,
  draftId: string,
  resolvedState: ResolvedDispatchState,
  payment: PaymentAttemptRow | null,
): Promise<void> {
  if (resolvedState === "accepted" && payment?.state === "captured") {
    await db
      .update(schema.draftLetters)
      .set({
        status: "dispatched",
        updatedAt: new Date(),
      })
      .where(eq(schema.draftLetters.id, draftId));
    return;
  }

  if (
    resolvedState === "rejected" &&
    (payment?.state === "cancelled" || payment?.state === "refund_pending")
  ) {
    await db
      .update(schema.draftLetters)
      .set({
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(schema.draftLetters.id, draftId));
  }
}
```

- [ ] **Step 5: Update `canFinalizeDispatchResolution` to accept refund_pending**

In the same file, update `canFinalizeDispatchResolution` (lines 86-99):

```typescript
export function canFinalizeDispatchResolution(
  resolvedState: ResolvedDispatchState,
  payment: PaymentAttemptRow | null,
): boolean {
  if (!payment) {
    return false;
  }

  if (resolvedState === "accepted") {
    return payment.state === "captured";
  }

  return (
    payment.state === "cancelled" ||
    payment.state === "captured" ||
    payment.state === "refund_pending"
  );
}
```

- [ ] **Step 6: Run the test — expect pass**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run backend/tests/dispatch-settlement.test.ts`
Expected: PASS

- [ ] **Step 7: Run all backend tests**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run backend/tests/`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/workers/dispatch-settlement.ts backend/tests/dispatch-settlement.test.ts
git commit -m "feat: refund on rejected dispatch for pre-captured payments

With automatic capture, payments are captured before dispatch.
If dispatch is rejected, the settlement worker now initiates a
Stripe refund (captured → refund_pending) instead of only handling
the authorize-then-cancel path.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Reorder PaymentElement to Twint-First

**Files:**
- Modify: `frontend/src/components/product/StripePaymentForm.tsx:96`
- Modify: `frontend/tests/checkout.test.ts`

- [ ] **Step 1: Add a test for Twint-first ordering**

In `frontend/tests/checkout.test.ts`, add a test in the appropriate describe block:

```typescript
  it("orders Twint before card in the StripePaymentForm PaymentElement", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync(
        new URL("../src/components/product/StripePaymentForm.tsx", import.meta.url),
        "utf-8",
      ),
    );
    const orderMatch = source.match(/paymentMethodOrder:\s*\[([^\]]+)\]/);
    expect(orderMatch).not.toBeNull();
    const methods = orderMatch![1].replace(/['"]/g, "").split(",").map((s) => s.trim());
    expect(methods[0]).toBe("twint");
    expect(methods).toContain("card");
  });
```

- [ ] **Step 2: Run the test — expect failure**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run frontend/tests/checkout.test.ts`
Expected: FAIL — current order is `["card", "twint"]`

- [ ] **Step 3: Reorder `paymentMethodOrder` in StripePaymentForm**

In `frontend/src/components/product/StripePaymentForm.tsx`, change line 96:

From:
```typescript
          paymentMethodOrder: ["card", "twint"],
```

To:
```typescript
          paymentMethodOrder: ["twint", "card"],
```

- [ ] **Step 4: Run the test — expect pass**

Run: `cd /home/sam/dev/swiss-mail && npx vitest run frontend/tests/checkout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/product/StripePaymentForm.tsx frontend/tests/checkout.test.ts
git commit -m "feat: reorder PaymentElement to show Twint first for Swiss audience

Twint is the dominant payment method in Switzerland. Show it first
in the PaymentElement tabs, followed by cards. Apple Pay and Google
Pay are handled automatically by Stripe based on device capabilities.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Apple Pay Domain Verification in Nginx

**Files:**
- Modify: `nginx/nginx.conf`
- Modify: `nginx/ark-fid-proxy.conf`
- Create: `nginx/apple-pay/apple-developer-merchantid-domain-association`

- [ ] **Step 1: Add Apple Pay location block to production nginx.conf**

In `nginx/nginx.conf`, add a location block inside the frontend server block (before `location /`), after line 86 (after the `www → non-www redirect` block):

```nginx
    # Apple Pay domain verification — served statically for Stripe
    location /.well-known/apple-developer-merchantid-domain-association {
      default_type application/octet-stream;
      alias /etc/nginx/apple-pay/apple-developer-merchantid-domain-association;
    }
```

- [ ] **Step 2: Add Apple Pay location block to dev proxy**

In `nginx/ark-fid-proxy.conf`, add the same block before each catch-all `location /` in the server blocks that serve frontend traffic (both port 5000 and port 443):

```nginx
    # Apple Pay domain verification — served statically for Stripe
    location /.well-known/apple-developer-merchantid-domain-association {
      default_type application/octet-stream;
      alias /etc/nginx/apple-pay/apple-developer-merchantid-domain-association;
    }
```

- [ ] **Step 3: Create placeholder directory and file**

```bash
mkdir -p nginx/apple-pay
echo "# Download this file from your Stripe Dashboard after registering the domain." > nginx/apple-pay/apple-developer-merchantid-domain-association
```

Note: On deployment, copy `nginx/apple-pay/` to `/etc/nginx/apple-pay/` (or adjust the nginx alias to point to the repo path). The actual file content must be downloaded from Stripe Dashboard after domain registration.

- [ ] **Step 4: Commit**

```bash
git add nginx/nginx.conf nginx/ark-fid-proxy.conf nginx/apple-pay/
git commit -m "infra: add Apple Pay domain verification route to nginx

Serves /.well-known/apple-developer-merchantid-domain-association
for Stripe Apple Pay domain verification. Placeholder file — replace
with actual content from Stripe Dashboard after domain registration.
Deploy step: copy nginx/apple-pay/ to /etc/nginx/apple-pay/.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: Final Validation

- [ ] **Step 1: Run typecheck**

Run: `cd /home/sam/dev/swiss-mail && npm run typecheck 2>&1`
Expected: Same pre-existing DraftShell errors only — no new errors from our changes

- [ ] **Step 2: Run full test suite**

Run: `cd /home/sam/dev/swiss-mail && npm test 2>&1`
Expected: All new tests pass, no regressions from baseline (1019+ passes, 3 pre-existing failures)

- [ ] **Step 3: Run lint**

Run: `cd /home/sam/dev/swiss-mail && npm run lint 2>&1`
Expected: No new lint errors from our changes

- [ ] **Step 4: Verify no dead imports or unused code introduced**

Check that all new imports are used and no lint warnings added.

---

## Post-Implementation: Manual Steps

After the code changes are deployed, the user needs to:

1. **Add real Stripe keys to `.env`:**
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`

2. **Stripe Dashboard configuration:**
   - Enable Twint (Settings → Payment methods)
   - Enable Apple Pay and register the production domain
   - Enable Google Pay
   - Create webhook endpoint pointing to `https://api.swissmail.ch/api/v1/webhooks/stripe`
   - Subscribe to events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` (note: `amount_capturable_updated` is no longer needed with automatic capture but won't cause harm)

3. **Apple Pay domain file:** Download the domain association file from Stripe Dashboard and replace `nginx/apple-pay/apple-developer-merchantid-domain-association`

4. **Deploy step:** Copy `nginx/apple-pay/` to `/etc/nginx/apple-pay/` on the server
