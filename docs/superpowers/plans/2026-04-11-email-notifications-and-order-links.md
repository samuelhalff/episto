# Email Notifications and Order Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overlapping post-payment email flow with truthful dispatch-status emails, keep Stripe as the payment receipt sender, and move customer order links to signed tokens that later dispatch emails can issue safely.

**Architecture:** Add a signed order-access-token helper under `orders`, teach checkout to keep Stripe receipt details in sync on both create and reuse, extract one shared dispatch-email context builder, then remove the obsolete `dispatch-confirmation` path from payment and worker flows. Keep legacy hash-based order links readable in `order.routes.ts` so old emails do not break while new emails use signed `/status/:orderToken` links. Work directly on `main` per repo instructions; do not create a worktree or branch for this repo.

**Tech Stack:** TypeScript, Fastify, Drizzle ORM, BullMQ, jose, Stripe SDK, Vitest, Next.js, next-intl

---

## File Structure

### New files

| File | Responsibility |
| --- | --- |
| `backend/src/modules/orders/order-access-token.ts` | Issue and verify signed order-access tokens; build stable order-status/PDF links for emails. |
| `backend/src/modules/orders/order-token-resolver.ts` | Resolve incoming order tokens by trying signed verification first and legacy hash lookup second. |
| `backend/src/modules/dispatch/dispatch-email-context.ts` | Build one canonical payload for dispatch-submitted and dispatch-accepted emails. |
| `backend/tests/order-access-token.test.ts` | Unit tests for signed token issuance and verification. |
| `backend/tests/order-token-resolver.test.ts` | Unit tests for signed-token resolution and legacy hash fallback. |

### Modified files

| File | Changes |
| --- | --- |
| `.env.example` | Add `ORDER_ACCESS_TOKEN_SECRET`. |
| `backend/src/shared/config/env.ts` | Validate the new signing secret. |
| `backend/src/modules/orders/order.routes.ts` | Replace inline hash-only token resolution with the shared resolver. |
| `backend/src/modules/payments/adapters/stripe.adapter.ts` | Add receipt description/metadata on create plus an update helper for reused pending PaymentIntents. |
| `backend/src/modules/payments/payment.routes.ts` | Sync Stripe receipt details on intent reuse and stop queueing Swiss Mail dispatch-confirmation email from payment flows. |
| `backend/src/modules/dispatch/dispatch-notifications.ts` | Rehome dispatch email enqueue helpers to the shared context builder and add `dispatch-submitted`. |
| `backend/src/workers/submit-dispatch.worker.ts` | Queue `dispatch-submitted` from dispatch ownership and stop sending `dispatch-confirmation` / same-cycle `dispatch-accepted`. |
| `backend/src/workers/reconcile-dispatch.worker.ts` | Send `dispatch-accepted` only on later acceptance confirmation and use signed order links. |
| `backend/src/workers/email-templates.ts` | Remove `dispatch-confirmation`, strengthen `dispatch-submitted` and `dispatch-accepted` around status links and shared structure. |
| `backend/src/workers/email-strings.ts` | Update submitted/accepted copy to match the cleaned sequence. |
| `backend/tests/env.test.ts` | Require the new signing secret in valid env fixtures. |
| `backend/tests/regression-env-validation.test.ts` | Keep valid env coverage passing with the new signing secret. |
| `backend/tests/stripe-adapter.test.ts` | Assert `receipt_email`, order reference description, and update behavior. |
| `backend/tests/payment-checkout.routes.test.ts` | Assert reused pending intents are updated and payment routes no longer queue dispatch email. |
| `backend/tests/payment-webhook.routes.test.ts` | Remove dispatch-confirmation assertions from capture-time webhook handling. |
| `backend/tests/immediate-capture-webhook.test.ts` | Lock the new webhook source block so it enqueues dispatch only, not customer email. |
| `backend/tests/dispatch-notifications.test.ts` | Cover submitted/accepted queue payloads and job IDs. |
| `backend/tests/dispatch-workers.test.ts` | Cover new submitted/accepted sequencing and removal of `dispatch-confirmation`. |
| `backend/tests/email-templates.test.ts` | Remove `dispatch-confirmation` coverage and assert consistent submitted/accepted templates with status links. |
| `frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx` | Keep the card but align the notice wording with Stripe receipt + later dispatch updates. |
| `frontend/src/messages/en-CH.json` | Replace vague confirmation-email copy with payment-receipt copy. |
| `frontend/src/messages/de-CH.json` | Same. |
| `frontend/src/messages/fr-CH.json` | Same. |
| `frontend/src/messages/it-CH.json` | Same. |
| `frontend/tests/confirmation-email-notice.test.ts` | Expect payment-receipt wording. |
| `frontend/tests/confirmation.test.ts` | Keep locale-key coverage while the copy changes. |
| `docs/04-product/email-flows.md` | Update the launch email matrix and remove the app-level payment-receipt assumption. |
| `docs/05-architecture/session-management.md` | Re-home order-link delivery to signed tokens usable by later dispatch emails. |
| `docs/03-ux/page-specifications.md` | Align the confirmation-page email notice and email sequence wording. |

### Deleted files

| File | Reason |
| --- | --- |
| `backend/src/modules/dispatch/dispatch-confirmation.ts` | Obsolete app-level order-confirmation email path; replaced by `dispatch-submitted` + shared context builder. |

---

### Task 1: Add signed order-access tokens and env contract

**Files:**
- Create: `backend/src/modules/orders/order-access-token.ts`
- Create: `backend/tests/order-access-token.test.ts`
- Modify: `.env.example`
- Modify: `backend/src/shared/config/env.ts`
- Modify: `backend/tests/env.test.ts`
- Modify: `backend/tests/regression-env-validation.test.ts`

- [ ] **Step 1: Write the failing token tests**

Create `backend/tests/order-access-token.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    ORDER_ACCESS_TOKEN_SECRET: "order-access-secret-at-least-32-chars",
  }),
}));

describe("signed order access tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T12:00:00.000Z"));
  });

  it("issues a signed token that resolves the payment attempt id and expiry", async () => {
    const { issueOrderAccessToken, verifyOrderAccessToken } = await import(
      "../src/modules/orders/order-access-token.js"
    );

    const expiresAt = new Date("2026-07-10T12:00:00.000Z");
    const token = await issueOrderAccessToken({
      paymentAttemptId: "payment-1",
      expiresAt,
    });

    await expect(verifyOrderAccessToken(token)).resolves.toEqual({
      paymentAttemptId: "payment-1",
      expiresAt: "2026-07-10T12:00:00.000Z",
    });
  });

  it("rejects expired signed order tokens", async () => {
    const { issueOrderAccessToken, verifyOrderAccessToken } = await import(
      "../src/modules/orders/order-access-token.js"
    );

    const token = await issueOrderAccessToken({
      paymentAttemptId: "payment-expired",
      expiresAt: new Date("2026-04-11T11:59:59.000Z"),
    });

    await expect(verifyOrderAccessToken(token)).rejects.toThrow(/expired|JWT/i);
  });
});
```

- [ ] **Step 2: Make env fixtures fail until the new secret exists**

Update the shared valid-env helpers in both env test files:

```ts
// backend/tests/env.test.ts
const validEnv = () => ({
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "https://s3.example.com",
  S3_BUCKET: "swiss-mail-files",
  S3_ACCESS_KEY: "AKIAEXAMPLE",
  S3_SECRET_KEY: "secret123",
  STRIPE_SECRET_KEY: "sk_test_abc123",
  STRIPE_WEBHOOK_SECRET: "whsec_test_abc123",
  ORDER_ACCESS_TOKEN_SECRET: "order-access-secret-at-least-32-chars",
  AZURE_OPENAI_ENDPOINT: "https://openai.azure.com",
  AZURE_OPENAI_API_KEY: "key123",
  RESEND_API_KEY: "re_abc123",
});
```

```ts
// backend/tests/regression-env-validation.test.ts
function makeValidEnv(overrides?: Record<string, unknown>) {
  return {
    NODE_ENV: "development",
    PORT: 3001,
    DATABASE_URL: "postgresql://localhost:5432/swissmail",
    REDIS_URL: "redis://localhost:6379",
    S3_ENDPOINT: "http://localhost:9000",
    S3_BUCKET: "swissmail",
    S3_ACCESS_KEY: "minio",
    S3_SECRET_KEY: "minio123",
    STRIPE_SECRET_KEY: "sk_test_abc123456",
    STRIPE_WEBHOOK_SECRET: "whsec_test_abc123",
    ORDER_ACCESS_TOKEN_SECRET: "order-access-secret-at-least-32-chars",
    RESEND_API_KEY: "re_test_abc",
    AZURE_OPENAI_ENDPOINT: "https://openai.azure.com",
    AZURE_OPENAI_API_KEY: "key123",
    ...overrides,
  };
}
```

Add this explicit env-schema regression too:

```ts
it("fails without ORDER_ACCESS_TOKEN_SECRET", () => {
  const e = { ...validEnv() };
  delete (e as Record<string, unknown>).ORDER_ACCESS_TOKEN_SECRET;
  const result = EnvSchema.safeParse(e);
  expect(result.success).toBe(false);
});
```

- [ ] **Step 3: Run the targeted tests and confirm they fail**

Run:

```bash
npx vitest run backend/tests/order-access-token.test.ts backend/tests/env.test.ts backend/tests/regression-env-validation.test.ts -v
```

Expected: FAIL because `order-access-token.ts` does not exist yet and env validation does not know about `ORDER_ACCESS_TOKEN_SECRET`.

- [ ] **Step 4: Implement the signed-token helper and env schema**

Create `backend/src/modules/orders/order-access-token.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";

import { env } from "../../shared/config/index.js";

const ORDER_ACCESS_AUDIENCE = "order-access";
const ORDER_ACCESS_ISSUER = "swiss-mail";
const encoder = new TextEncoder();

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
  const { payload } = await jwtVerify(token, getOrderAccessKey(), {
    audience: ORDER_ACCESS_AUDIENCE,
    issuer: ORDER_ACCESS_ISSUER,
  });

  if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
    throw new Error("Invalid signed order access token payload");
  }

  return {
    paymentAttemptId: payload.sub,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}
```

Update the env schema:

```ts
// backend/src/shared/config/env.ts
ORDER_ACCESS_TOKEN_SECRET: z.string().min(32),
```

Add the secret to `.env.example` next to the other payment/session values:

```env
ORDER_ACCESS_TOKEN_SECRET=replace_with_long_random_secret
```

- [ ] **Step 5: Re-run the targeted tests and confirm they pass**

Run:

```bash
npx vitest run backend/tests/order-access-token.test.ts backend/tests/env.test.ts backend/tests/regression-env-validation.test.ts -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .env.example backend/src/shared/config/env.ts backend/src/modules/orders/order-access-token.ts backend/tests/order-access-token.test.ts backend/tests/env.test.ts backend/tests/regression-env-validation.test.ts
git commit -m "feat(orders): add signed order access tokens"
```

---

### Task 2: Resolve signed order tokens in order routes while keeping legacy links alive

**Files:**
- Create: `backend/src/modules/orders/order-token-resolver.ts`
- Create: `backend/tests/order-token-resolver.test.ts`
- Modify: `backend/src/modules/orders/order.routes.ts`

- [ ] **Step 1: Write the failing resolver tests**

Create `backend/tests/order-token-resolver.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOrderAccessToken = vi.fn();

vi.mock("../src/modules/orders/order-access-token.js", () => ({
  verifyOrderAccessToken,
}));

vi.mock("../src/modules/sessions/session.service.js", () => ({
  hashResumeToken: (token: string) => `hashed:${token}`,
}));

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(rows),
      })),
    })),
  };
}

describe("resolveOrderAccessPayment", () => {
  beforeEach(() => {
    verifyOrderAccessToken.mockReset();
  });

  it("prefers the signed token payload when verification succeeds", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(
        makeSelectChain([
          {
            id: "payment-1",
            orderAccessTokenExpiresAt: new Date("2026-07-10T12:00:00.000Z"),
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockResolvedValue({
      paymentAttemptId: "payment-1",
      expiresAt: "2026-07-10T12:00:00.000Z",
    });

    const { resolveOrderAccessPayment } = await import(
      "../src/modules/orders/order-token-resolver.js"
    );

    const payment = await resolveOrderAccessPayment(db as never, "signed-token");

    expect(payment?.id).toBe("payment-1");
  });

  it("falls back to the legacy hash lookup when signed verification fails", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(
        makeSelectChain([
          {
            id: "payment-legacy",
            orderAccessTokenHash: "hashed:legacy-token",
            orderAccessTokenExpiresAt: new Date("2026-07-10T12:00:00.000Z"),
          },
        ]),
      ),
    };

    verifyOrderAccessToken.mockRejectedValue(new Error("JWT verification failed"));

    const { resolveOrderAccessPayment } = await import(
      "../src/modules/orders/order-token-resolver.js"
    );

    const payment = await resolveOrderAccessPayment(db as never, "legacy-token");

    expect(payment?.id).toBe("payment-legacy");
  });
});
```

- [ ] **Step 2: Run the resolver test and confirm it fails**

Run:

```bash
npx vitest run backend/tests/order-token-resolver.test.ts -v
```

Expected: FAIL because `order-token-resolver.ts` does not exist yet.

- [ ] **Step 3: Implement the shared resolver and wire the route**

Create `backend/src/modules/orders/order-token-resolver.ts`:

```ts
import { eq } from "drizzle-orm";

import { schema } from "../../db/index.js";
import type { Db } from "../../db/index.js";
import { hashResumeToken } from "../sessions/session.service.js";
import { verifyOrderAccessToken } from "./order-access-token.js";

export async function resolveOrderAccessPayment(
  db: Db,
  orderToken: string,
) {
  try {
    const claims = await verifyOrderAccessToken(orderToken);
    const [payment] = await db
      .select()
      .from(schema.paymentAttempts)
      .where(eq(schema.paymentAttempts.id, claims.paymentAttemptId))
      .limit(1);

    if (!payment) return null;
    if (!payment.orderAccessTokenExpiresAt) return null;
    if (payment.orderAccessTokenExpiresAt < new Date()) return null;
    return payment;
  } catch {
    const tokenHash = hashResumeToken(orderToken);
    const [payment] = await db
      .select()
      .from(schema.paymentAttempts)
      .where(eq(schema.paymentAttempts.orderAccessTokenHash, tokenHash))
      .limit(1);

    if (!payment) return null;
    if (!payment.orderAccessTokenExpiresAt) return null;
    if (payment.orderAccessTokenExpiresAt < new Date()) return null;
    return payment;
  }
}
```

Update `backend/src/modules/orders/order.routes.ts`:

```ts
import { resolveOrderAccessPayment } from "./order-token-resolver.js";

async function resolveOrderToken(
  db: ReturnType<typeof getDb>,
  orderToken: string,
) {
  return resolveOrderAccessPayment(db, orderToken);
}
```

- [ ] **Step 4: Re-run the resolver and order-window tests**

Run:

```bash
npx vitest run backend/tests/order-token-resolver.test.ts backend/tests/order-access-window.test.ts -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/orders/order-token-resolver.ts backend/src/modules/orders/order.routes.ts backend/tests/order-token-resolver.test.ts
git commit -m "feat(orders): resolve signed and legacy order links"
```

---

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

  const { createPaymentIntent } = await import(
    "../src/modules/payments/adapters/stripe.adapter.js"
  );

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

  const { updatePaymentIntentReceiptDetails } = await import(
    "../src/modules/payments/adapters/stripe.adapter.js"
  );

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

### Task 4: Build one shared dispatch email context and remove the old confirmation template

**Files:**
- Create: `backend/src/modules/dispatch/dispatch-email-context.ts`
- Modify: `backend/src/modules/dispatch/dispatch-notifications.ts`
- Modify: `backend/src/workers/email-templates.ts`
- Modify: `backend/src/workers/email-strings.ts`
- Modify: `backend/tests/dispatch-notifications.test.ts`
- Modify: `backend/tests/email-templates.test.ts`

- [ ] **Step 1: Write failing submitted/accepted email tests**

Extend `backend/tests/dispatch-notifications.test.ts` with a submitted-email job-ID test:

```ts
it("uses a BullMQ-safe job id for submitted-dispatch emails", async () => {
  const db = {
    select: vi
      .fn()
      .mockImplementationOnce(() =>
        makeSelectChain([
          {
            id: "payment-1",
            sessionId: "session-1",
            draftId: "draft-1",
            state: "captured",
            amountCents: 625,
            currency: "CHF",
            orderAccessTokenExpiresAt: new Date("2026-07-10T12:00:00.000Z"),
          },
        ]),
      )
      .mockImplementationOnce(() =>
        makeSelectChain([
          {
            id: "draft-1",
            deliveryType: "standard",
            senderProfileId: null,
            recipientProfileId: null,
          },
        ]),
      )
      .mockImplementationOnce(() =>
        makeSelectChain([{ email: "person@example.com", locale: "en-CH" }]),
      ),
  };

  const { enqueueDispatchSubmittedEmail } = await import(
    "../src/modules/dispatch/dispatch-notifications.js"
  );

  await enqueueDispatchSubmittedEmail(db as never, {
    dispatchAttemptId: "dispatch-1",
    draftId: "draft-1",
    paymentId: "payment-1",
  });

  expect(mocks.add).toHaveBeenCalledWith(
    "dispatch-submitted",
    expect.objectContaining({
      template: "dispatch-submitted",
      data: expect.objectContaining({
        orderRef: expect.any(String),
        statusUrl: expect.stringContaining("/status/"),
      }),
    }),
    { jobId: "dispatch-submitted-dispatch-1" },
  );
});
```

Replace the template assertions in `backend/tests/email-templates.test.ts`:

```ts
it("renders dispatch-submitted with a status link and shared footer data", () => {
  const result = renderTemplate("dispatch-submitted", "en-CH", {
    orderRef: "EP-12345",
    statusUrl: "https://swissmail.ch/status/token-123",
    downloadUrl: "https://swissmail.ch/api/v1/orders/token-123/pdf",
    supportEmail: "support@test.com",
    appPublicUrl: "https://swissmail.ch",
    legalEntityName: "West Bay SA",
    legalEntityAddress: "Test Address",
    legalEntityCountry: "Switzerland",
    legalEntityUidVat: "CHE-107.892.984",
  });

  expect(result.text).toContain("EP-12345");
  expect(result.text).toContain("https://swissmail.ch/status/token-123");
  expect(result.html).toContain("https://swissmail.ch/status/token-123");
  expect(result.html).toContain("West Bay SA");
});

it("throws for removed dispatch-confirmation template", () => {
  expect(() => renderTemplate("dispatch-confirmation", "en-CH", {})).toThrow(
    "Unknown email template: dispatch-confirmation",
  );
});
```

- [ ] **Step 2: Run the dispatch email tests and confirm they fail**

Run:

```bash
npx vitest run backend/tests/dispatch-notifications.test.ts backend/tests/email-templates.test.ts -v
```

Expected: FAIL because there is no submitted-email helper yet and `dispatch-confirmation` still exists in the template registry.

- [ ] **Step 3: Implement the shared dispatch email context**

Create `backend/src/modules/dispatch/dispatch-email-context.ts`:

```ts
import { eq } from "drizzle-orm";
import { buildOrderReference } from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { issueOrderAccessToken } from "../orders/order-access-token.js";

function resolvePersonName(
  value: { firstName?: string | null; lastName?: string | null; company?: string | null } | null,
): string {
  return [value?.firstName, value?.lastName].filter(Boolean).join(" ").trim() || value?.company?.trim() || "";
}

export async function buildDispatchEmailContext(
  db: Db,
  args: { draftId: string; paymentId: string },
) {
  const [[payment], [draft]] = await Promise.all([
    db.select().from(schema.paymentAttempts).where(eq(schema.paymentAttempts.id, args.paymentId)).limit(1),
    db.select().from(schema.draftLetters).where(eq(schema.draftLetters.id, args.draftId)).limit(1),
  ]);

  if (!payment || !draft || !payment.orderAccessTokenExpiresAt) {
    return null;
  }

  const [[sender], [recipient]] = await Promise.all([
    draft.senderProfileId
      ? db
          .select({
            firstName: schema.senderProfiles.firstName,
            lastName: schema.senderProfiles.lastName,
            company: schema.senderProfiles.company,
          })
          .from(schema.senderProfiles)
          .where(eq(schema.senderProfiles.id, draft.senderProfileId))
          .limit(1)
      : Promise.resolve([]),
    draft.recipientProfileId
      ? db
          .select({
            firstName: schema.recipientProfiles.firstName,
            lastName: schema.recipientProfiles.lastName,
            company: schema.recipientProfiles.company,
          })
          .from(schema.recipientProfiles)
          .where(eq(schema.recipientProfiles.id, draft.recipientProfileId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const [session] = await db
    .select({ email: schema.sessions.email, locale: schema.sessions.locale })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, payment.sessionId))
    .limit(1);

  if (!session?.email) return null;

  const siteUrl = env().APP_PUBLIC_URL ?? env().CORS_ORIGIN.split(",")[0]!.trim();
  const token = await issueOrderAccessToken({
    paymentAttemptId: payment.id,
    expiresAt: payment.orderAccessTokenExpiresAt,
  });

  return {
    to: session.email,
    locale: session.locale ?? "en-CH",
    orderRef: buildOrderReference(args.draftId),
    statusUrl: `${siteUrl}/status/${token}`,
    downloadUrl: `${siteUrl}/api/v1/orders/${token}/pdf`,
    deliveryType: draft.deliveryType,
    senderName: resolvePersonName(sender ?? null),
    recipientName: resolvePersonName(recipient ?? null),
    statementRetentionDays: env().STATEMENT_RETENTION_DAYS,
    appPublicUrl: siteUrl,
    brandName: env().APP_DISPLAY_NAME,
    supportEmail: env().SUPPORT_EMAIL,
    legalEntityName: env().LEGAL_ENTITY_NAME,
    legalEntityAddress: `${env().LEGAL_ENTITY_ADDRESS_LINE_1}, ${env().LEGAL_ENTITY_ADDRESS_LINE_2}`,
    legalEntityCountry: env().LEGAL_ENTITY_COUNTRY,
    legalEntityUidVat: env().LEGAL_ENTITY_UID_VAT,
  };
}
```

Update `backend/src/modules/dispatch/dispatch-notifications.ts`:

```ts
import type { Db } from "../../db/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { buildDispatchEmailContext } from "./dispatch-email-context.js";

export async function enqueueDispatchSubmittedEmail(
  db: Db,
  args: { dispatchAttemptId: string; draftId: string; paymentId: string },
): Promise<void> {
  const context = await buildDispatchEmailContext(db, {
    draftId: args.draftId,
    paymentId: args.paymentId,
  });
  if (!context) return;

  const job: SendEmailJob = {
    to: context.to,
    template: "dispatch-submitted",
    locale: context.locale,
    data: context,
  };

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("dispatch-submitted", job, {
    jobId: `dispatch-submitted-${args.dispatchAttemptId}`,
  });
}
```

Also update `enqueueDispatchAcceptedEmail()` to take `paymentId` instead of `rawOrderAccessToken` and to merge in the same shared context:

```ts
const context = await buildDispatchEmailContext(db, {
  draftId: args.draftId,
  paymentId: args.paymentId,
});
if (!context) return;

const job: SendEmailJob = {
  to: context.to,
  template: "dispatch-accepted",
  locale: context.locale,
  data: {
    ...context,
    providerReference: args.providerReference,
    trackingNumber: args.trackingNumber,
  },
};
```

Update the template registry in `backend/src/workers/email-templates.ts`:

```ts
const TEMPLATE_RENDERERS = {
  "dispatch-submitted": renderDispatchSubmitted,
  "dispatch-accepted": renderDispatchAccepted,
  "resume-link": renderResumeLink,
  "refund-confirmed": renderRefundConfirmed,
} as const;
```

And make `dispatch-submitted` use `statusUrl` as the primary CTA:

```ts
const statusUrl = readString(data, "statusUrl");
const bodyParts = [
  heading(s.heading),
  paragraph(escapeHtml(s.body)),
  detailTable(rows),
  primaryButton(statusUrl, s.statusLabel),
  mutedText(escapeHtml(s.followUp)),
];
```

- [ ] **Step 4: Re-run the dispatch email tests and confirm they pass**

Run:

```bash
npx vitest run backend/tests/dispatch-notifications.test.ts backend/tests/email-templates.test.ts -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/dispatch/dispatch-email-context.ts backend/src/modules/dispatch/dispatch-notifications.ts backend/src/workers/email-templates.ts backend/src/workers/email-strings.ts backend/tests/dispatch-notifications.test.ts backend/tests/email-templates.test.ts
git commit -m "feat(dispatch): unify submitted and accepted email context"
```

---

### Task 5: Rewire notification ownership to dispatch state transitions

**Files:**
- Delete: `backend/src/modules/dispatch/dispatch-confirmation.ts`
- Modify: `backend/src/modules/payments/payment.routes.ts`
- Modify: `backend/src/workers/submit-dispatch.worker.ts`
- Modify: `backend/src/workers/reconcile-dispatch.worker.ts`
- Modify: `backend/tests/payment-webhook.routes.test.ts`
- Modify: `backend/tests/payment-checkout.routes.test.ts`
- Modify: `backend/tests/dispatch-workers.test.ts`
- Modify: `backend/tests/immediate-capture-webhook.test.ts`

- [ ] **Step 1: Change the failing worker/webhook assertions first**

Update `backend/tests/payment-webhook.routes.test.ts` to remove the old queue mock and assert capture-time email is gone:

```ts
it("does not enqueue a Swiss Mail dispatch email from payment capture", async () => {
  mocks.constructWebhookEvent.mockReturnValue({
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_1",
        metadata: { draftId: "draft-1", paymentAttemptId: "payment-1" },
        latest_charge: "ch_1",
      },
    },
  });

  mocks.getPaymentAttemptById.mockResolvedValue({
    id: "payment-1",
    draftId: "draft-1",
    amountCents: 625,
    state: "pending",
  });
  mocks.transitionPaymentState.mockResolvedValue({
    payment: { id: "payment-1", state: "captured" },
    rawOrderAccessToken: null,
  });
  mocks.getLatestSnapshot.mockResolvedValue({
    id: "snapshot-1",
    renderedPdfAssetId: "pdf-1",
  });

  const response = await app.inject({
    method: "POST",
    url: "/webhooks/stripe",
    payload: { ok: true },
    headers: {
      "content-type": "application/json",
      "stripe-signature": "signature",
    },
  });

  expect(response.statusCode).toBe(200);
  expect(mocks.enqueueDispatchSubmission).toHaveBeenCalledWith({
    draftId: "draft-1",
    snapshotId: "snapshot-1",
    paymentId: "payment-1",
  });
  expect(mocks.enqueueDispatchConfirmationEmail).not.toHaveBeenCalled();
});
```

Update `backend/tests/dispatch-workers.test.ts` to replace the old confirmation-email assertions:

```ts
it("queues dispatch-submitted but not dispatch-accepted when provider acceptance is immediate", async () => {
  // keep the accepted adapter result from the current test fixture
  await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

  expect(mocks.emailQueueAdd).toHaveBeenCalledWith(
    "dispatch-submitted",
    expect.objectContaining({
      template: "dispatch-submitted",
    }),
    expect.objectContaining({
      jobId: "dispatch-submitted-dispatch-2a",
    }),
  );
  expect(mocks.enqueueDispatchAcceptedEmail).not.toHaveBeenCalled();
  expect(mocks.enqueueDispatchConfirmationEmail).not.toHaveBeenCalled();
});
```

Update `backend/tests/immediate-capture-webhook.test.ts`:

```ts
it("does not send dispatch confirmation email on capture", () => {
  expect(succeededBlock).not.toContain("enqueueDispatchConfirmationEmail");
});
```

- [ ] **Step 2: Run the affected tests and confirm they fail**

Run:

```bash
npx vitest run backend/tests/payment-webhook.routes.test.ts backend/tests/payment-checkout.routes.test.ts backend/tests/dispatch-workers.test.ts backend/tests/immediate-capture-webhook.test.ts -v
```

Expected: FAIL because the old confirmation-email path is still active.

- [ ] **Step 3: Remove capture-time emails and move ownership to dispatch workers**

Delete `backend/src/modules/dispatch/dispatch-confirmation.ts`.

Update `backend/src/modules/payments/payment.routes.ts` by removing the `enqueueDispatchConfirmationEmail` import and every callsite:

```ts
// delete this import
import { enqueueDispatchConfirmationEmail } from "../dispatch/dispatch-confirmation.js";

// delete the rawOrderAccessToken email blocks in:
// - webhook payment_intent.succeeded
// - POST /drafts/:draftId/checkout pending-intent success reconciliation
// - GET /drafts/:draftId/payment pending payment success reconciliation
```

Update `backend/src/workers/submit-dispatch.worker.ts`:

```ts
import {
  enqueueDispatchAcceptedEmail,
  enqueueDispatchSubmittedEmail,
} from "../modules/dispatch/dispatch-notifications.js";

// after dispatch state is written
if (result.state !== "rejected") {
  await enqueueDispatchSubmittedEmail(db, {
    dispatchAttemptId: attempt.id,
    draftId,
    paymentId,
  });
}

// remove enqueueDispatchConfirmationEmail entirely
// remove same-cycle enqueueDispatchAcceptedEmail from submit-dispatch.worker.ts
```

Update `backend/src/workers/reconcile-dispatch.worker.ts` so accepted email is only sent from later reconciliation:

```ts
if (status.state === "accepted") {
  await enqueueDispatchAcceptedEmail(db, {
    dispatchAttemptId,
    draftId: attempt.draftId,
    paymentId: attempt.paymentAttemptId!,
    providerReference: status.providerReference ?? null,
    trackingNumber: status.trackingNumber ?? null,
  });
}
```

- [ ] **Step 4: Re-run the affected tests and confirm they pass**

Run:

```bash
npx vitest run backend/tests/payment-webhook.routes.test.ts backend/tests/payment-checkout.routes.test.ts backend/tests/dispatch-workers.test.ts backend/tests/immediate-capture-webhook.test.ts -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/payments/payment.routes.ts backend/src/workers/submit-dispatch.worker.ts backend/src/workers/reconcile-dispatch.worker.ts backend/tests/payment-webhook.routes.test.ts backend/tests/payment-checkout.routes.test.ts backend/tests/dispatch-workers.test.ts backend/tests/immediate-capture-webhook.test.ts
git rm backend/src/modules/dispatch/dispatch-confirmation.ts
git commit -m "fix(dispatch): remove duplicate confirmation email path"
```

---

### Task 6: Align frontend receipt copy and canonical docs

**Files:**
- Modify: `frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Modify: `frontend/tests/confirmation-email-notice.test.ts`
- Modify: `frontend/tests/confirmation.test.ts`
- Modify: `docs/04-product/email-flows.md`
- Modify: `docs/05-architecture/session-management.md`
- Modify: `docs/03-ux/page-specifications.md`

- [ ] **Step 1: Write the failing copy tests**

Update `frontend/tests/confirmation-email-notice.test.ts`:

```ts
it("renders the payment receipt notice with clear hierarchy", () => {
  const { container } = render(
    React.createElement(ConfirmationEmailNotice, {
      eyebrow: "Payment receipt",
      title: "A payment receipt has been sent to your email",
      detail: "You'll also receive a dispatch email if the status changes.",
    }),
  );

  expect(screen.getByText("Payment receipt")).toBeTruthy();
  expect(
    screen.getByText("A payment receipt has been sent to your email"),
  ).toBeTruthy();
  expect(
    screen.getByText("You'll also receive a dispatch email if the status changes."),
  ).toBeTruthy();
  expect(container.firstElementChild).toBeTruthy();
});
```

Update the locale JSON expectations in `frontend/tests/confirmation.test.ts` by leaving the keys but changing the underlying copy in the JSON files.

- [ ] **Step 2: Run the frontend confirmation tests and confirm they fail**

Run:

```bash
npx vitest run frontend/tests/confirmation-email-notice.test.ts frontend/tests/confirmation.test.ts -v
```

Expected: FAIL because the current locale strings still say "confirmation email".

- [ ] **Step 3: Update the locale strings and the docs**

Replace the locale message trio in all four frontend message files:

```json
"emailNoticeEyebrow": "Payment receipt",
"emailNotice": "A payment receipt has been sent to your email",
"emailNoticeDetail": "You'll also receive a dispatch email if the status changes."
```

Use these translated values:

```json
// de-CH
"emailNoticeEyebrow": "Zahlungsbeleg",
"emailNotice": "Ein Zahlungsbeleg wurde an Ihre E-Mail-Adresse gesendet",
"emailNoticeDetail": "Sie erhalten auch eine Versand-E-Mail, wenn sich der Status ändert."
```

```json
// fr-CH
"emailNoticeEyebrow": "Reçu de paiement",
"emailNotice": "Un reçu de paiement a été envoyé à votre adresse e-mail",
"emailNoticeDetail": "Vous recevrez aussi un e-mail d'envoi si le statut change."
```

```json
// it-CH
"emailNoticeEyebrow": "Ricevuta di pagamento",
"emailNotice": "Una ricevuta di pagamento è stata inviata al tuo indirizzo e-mail",
"emailNoticeDetail": "Riceverai anche un'e-mail di spedizione se lo stato cambia."
```

Update the canonical docs so they match the new design:

```md
<!-- docs/04-product/email-flows.md -->
- Stripe is the payment receipt sender for launch.
- Swiss Mail sends dispatch-submitted, later accepted/rejected updates, and refund/resume emails.
- The secure order-status link is carried by signed order-access tokens in Swiss Mail dispatch emails.
```

```md
<!-- docs/05-architecture/session-management.md -->
- Order access tokens are signed order links, not raw one-time values that must be emailed at payment capture.
- The order-status route accepts both signed tokens and legacy hashed links during the transition.
```

```md
<!-- docs/03-ux/page-specifications.md -->
- The confirmation notice must say "payment receipt", not generic "confirmation email".
- The customer-facing sequence is Stripe receipt first, then Swiss Mail dispatch emails only when dispatch state changes.
```

- [ ] **Step 4: Re-run the frontend confirmation tests**

Run:

```bash
npx vitest run frontend/tests/confirmation-email-notice.test.ts frontend/tests/confirmation.test.ts -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx frontend/src/messages/en-CH.json frontend/src/messages/de-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json frontend/tests/confirmation-email-notice.test.ts frontend/tests/confirmation.test.ts docs/04-product/email-flows.md docs/05-architecture/session-management.md docs/03-ux/page-specifications.md
git commit -m "fix(frontend): align receipt and dispatch email copy"
```

---

### Task 7: Verify the integrated behavior

**Files:**
- No new source files expected

- [ ] **Step 1: Run the targeted backend sweep**

Run:

```bash
npx vitest run backend/tests/order-access-token.test.ts backend/tests/order-token-resolver.test.ts backend/tests/order-access-window.test.ts backend/tests/stripe-adapter.test.ts backend/tests/payment-checkout.routes.test.ts backend/tests/payment-webhook.routes.test.ts backend/tests/dispatch-notifications.test.ts backend/tests/dispatch-workers.test.ts backend/tests/email-templates.test.ts backend/tests/immediate-capture-webhook.test.ts -v
```

Expected: PASS

- [ ] **Step 2: Run the targeted frontend sweep**

Run:

```bash
npx vitest run frontend/tests/confirmation-email-notice.test.ts frontend/tests/confirmation.test.ts -v
```

Expected: PASS

- [ ] **Step 3: Run the repository validation commands under Node 20**

Run:

```bash
npx -y -p node@20.19.0 -c 'npm run lint && npm run typecheck && npm test && npm run build'
```

Expected: PASS

- [ ] **Step 4: Review the changed behavior with a fresh-eye sweep**

Run:

```bash
git --no-pager diff -- backend/src/modules/payments/adapters/stripe.adapter.ts backend/src/modules/payments/payment.routes.ts backend/src/modules/orders/order.routes.ts backend/src/modules/dispatch/dispatch-notifications.ts backend/src/workers/submit-dispatch.worker.ts backend/src/workers/reconcile-dispatch.worker.ts backend/src/workers/email-templates.ts frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx docs/04-product/email-flows.md docs/05-architecture/session-management.md docs/03-ux/page-specifications.md
```

Expected: one coherent diff that:

- removes `dispatch-confirmation`
- adds signed order-link support
- keeps Stripe receipt fields explicit
- limits Swiss Mail emails to truthful dispatch updates
- updates the confirmation wording everywhere
