# Email Notifications and Order Links Implementation Plan — Part 2

> Split from [2026-04-11-email-notifications-and-order-links.md](2026-04-11-email-notifications-and-order-links.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Task 3: Keep Stripe receipt details in sync on create and reuse

### Task 3: Keep Stripe receipt details in sync on create and reuse

**Files:**

- Modify: `backend/src/modules/payments/adapters/stripe.adapter.ts`
- Modify: `backend/src/modules/payments/payment.routes.ts`
- Modify: `backend/tests/stripe-adapter.test.ts`
- Modify: `backend/tests/payment-checkout.routes.test.ts`
- Modify: `backend/tests/regression-stripe-safety.test.ts`

- [ ] **Step 1: Extend the Stripe adapter tests first**

Update `backend/tests/stripe-adapter.test.ts`:

```ts
const paymentIntentsCreate = vi.fn();
const paymentIntentsUpdate = vi.fn();

// inside MockStripe
paymentIntents = {
  create: paymentIntentsCreate,
  update: paymentIntentsUpdate,
  retrieve: vi.fn(),
  capture: vi.fn(),
  cancel: vi.fn(),
};
```

Add these tests:

```ts
it("passes receipt_email and a customer-visible order description on create", async () => {
  paymentIntentsCreate.mockResolvedValue({
    id: "pi_test_1",
    client_secret: "cs_test_1",
  });

  const { createPaymentIntent } =
    await import("../src/modules/payments/adapters/stripe.adapter.js");

  await createPaymentIntent(625, {
    draftId: "draft-1",
    sessionId: "session-1",
    paymentAttemptId: "payment-1",
    customerEmail: "payer@example.com",
    orderRef: "EP-ORDER-1",
    deliveryType: "standard",
  });

  expect(paymentIntentsCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      receipt_email: "payer@example.com",
      description: "Swiss Mail order EP-ORDER-1",
      metadata: expect.objectContaining({
        orderRef: "EP-ORDER-1",
        deliveryType: "standard",
      }),
    }),
    { idempotencyKey: "payment-1" },
  );
});

it("updates receipt details on a reused pending intent", async () => {
  paymentIntentsUpdate.mockResolvedValue({ id: "pi_existing" });

  const { updatePaymentIntentReceiptDetails } =
    await import("../src/modules/payments/adapters/stripe.adapter.js");

  await updatePaymentIntentReceiptDetails("pi_existing", {
    customerEmail: "payer@example.com",
    orderRef: "EP-ORDER-1",
    draftId: "draft-1",
    sessionId: "session-1",
    paymentAttemptId: "payment-1",
    deliveryType: "registered",
  });

  expect(paymentIntentsUpdate).toHaveBeenCalledWith(
    "pi_existing",
    expect.objectContaining({
      receipt_email: "payer@example.com",
      description: "Swiss Mail order EP-ORDER-1",
      metadata: expect.objectContaining({
        orderRef: "EP-ORDER-1",
        deliveryType: "registered",
      }),
    }),
  );
});
```

Update `backend/tests/payment-checkout.routes.test.ts` to mock the new helper:

```ts
const mocks = vi.hoisted(() => ({
  // existing mocks...
  updatePaymentIntentReceiptDetails: vi.fn(),
}));

vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  createPaymentIntent: mocks.createPaymentIntent,
  constructWebhookEvent: vi.fn(),
  getPaymentIntentForCheckout: mocks.getPaymentIntentForCheckout,
  updatePaymentIntentReceiptDetails: mocks.updatePaymentIntentReceiptDetails,
}));
```

Add this assertion to the existing "reuses a resumable existing pending payment intent" test:

```ts
expect(mocks.updatePaymentIntentReceiptDetails).toHaveBeenCalledWith("pi_existing", {
  customerEmail: "payer@example.com",
  orderRef: expect.stringMatching(/^EP-/),
  draftId: "draft-1",
  sessionId: "session-1",
  paymentAttemptId: "payment-existing",
  deliveryType: "standard",
});
```

- [ ] **Step 2: Run the Stripe + checkout tests and confirm they fail**

Run:

```bash
npx vitest run backend/tests/stripe-adapter.test.ts backend/tests/payment-checkout.routes.test.ts backend/tests/regression-stripe-safety.test.ts -v
```

Expected: FAIL because `createPaymentIntent()` has no `orderRef`/`deliveryType` support and there is no `updatePaymentIntentReceiptDetails()` helper yet.

- [ ] **Step 3: Implement receipt creation + reuse sync**

Update `backend/src/modules/payments/adapters/stripe.adapter.ts`:

```ts
function buildStripeReceiptDescription(orderRef: string): string {
  return `Swiss Mail order ${orderRef}`;
}

export async function createPaymentIntent(
  amountCents: number,
  metadata: {
    draftId: string;
    sessionId: string;
    paymentAttemptId: string;
    customerEmail: string;
    orderRef: string;
    deliveryType: "standard" | "registered";
  },
): Promise<{ paymentIntentId: string; clientSecret: string }> {
  const intent = await getStripe().paymentIntents.create(
    {
      amount: amountCents,
      currency: "chf",
      receipt_email: metadata.customerEmail,
      description: buildStripeReceiptDescription(metadata.orderRef),
      metadata: {
        draftId: metadata.draftId,
        sessionId: metadata.sessionId,
        paymentAttemptId: metadata.paymentAttemptId,
        orderRef: metadata.orderRef,
        deliveryType: metadata.deliveryType,
      },
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: metadata.paymentAttemptId },
  );
  // ...existing return block...
}

export async function updatePaymentIntentReceiptDetails(
  paymentIntentId: string,
  metadata: {
    customerEmail: string;
    orderRef: string;
    draftId: string;
    sessionId: string;
    paymentAttemptId: string;
    deliveryType: "standard" | "registered";
  },
): Promise<void> {
  await getStripe().paymentIntents.update(paymentIntentId, {
    receipt_email: metadata.customerEmail,
    description: buildStripeReceiptDescription(metadata.orderRef),
    metadata: {
      draftId: metadata.draftId,
      sessionId: metadata.sessionId,
      paymentAttemptId: metadata.paymentAttemptId,
      orderRef: metadata.orderRef,
      deliveryType: metadata.deliveryType,
    },
  });
}
```

Update the create/reuse paths in `backend/src/modules/payments/payment.routes.ts`:

```ts
const orderRef = buildOrderReference(draftId);

// new payment intent
const stripeResult = await createPaymentIntent(amountCents, {
  draftId,
  sessionId: session.id,
  paymentAttemptId: payment.id,
  customerEmail: body.email,
  orderRef,
  deliveryType: draft.deliveryType,
});
```

```ts
// reused pending payment intent before returning the client secret
await updatePaymentIntentReceiptDetails(result.stripePaymentIntentId, {
  customerEmail: body.email,
  orderRef,
  draftId,
  sessionId: session.id,
  paymentAttemptId: result.paymentAttemptId,
  deliveryType: draft.deliveryType,
});
```

- [ ] **Step 4: Re-run the Stripe + checkout tests and confirm they pass**

Run:

```bash
npx vitest run backend/tests/stripe-adapter.test.ts backend/tests/payment-checkout.routes.test.ts backend/tests/regression-stripe-safety.test.ts -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/payments/adapters/stripe.adapter.ts backend/src/modules/payments/payment.routes.ts backend/tests/stripe-adapter.test.ts backend/tests/payment-checkout.routes.test.ts backend/tests/regression-stripe-safety.test.ts
git commit -m "feat(payments): sync Stripe receipt details on checkout reuse"
```

---
