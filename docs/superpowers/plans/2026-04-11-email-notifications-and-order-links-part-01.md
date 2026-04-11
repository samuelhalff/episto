# Email Notifications and Order Links Implementation Plan — Part 1

> Split from [2026-04-11-email-notifications-and-order-links.md](2026-04-11-email-notifications-and-order-links.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- New files
- Modified files
- Deleted files
- Task 1: Add signed order-access tokens and env contract
- Task 2: Resolve signed order tokens in order routes while keeping legacy links alive

### New files

| File                                                     | Responsibility                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `backend/src/modules/orders/order-access-token.ts`       | Issue and verify signed order-access tokens; build stable order-status/PDF links for emails.     |
| `backend/src/modules/orders/order-token-resolver.ts`     | Resolve incoming order tokens by trying signed verification first and legacy hash lookup second. |
| `backend/src/modules/dispatch/dispatch-email-context.ts` | Build one canonical payload for dispatch-submitted and dispatch-accepted emails.                 |
| `backend/tests/order-access-token.test.ts`               | Unit tests for signed token issuance and verification.                                           |
| `backend/tests/order-token-resolver.test.ts`             | Unit tests for signed-token resolution and legacy hash fallback.                                 |

### Modified files

| File                                                              | Changes                                                                                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `.env.example`                                                    | Add `ORDER_ACCESS_TOKEN_SECRET`.                                                                                                  |
| `backend/src/shared/config/env.ts`                                | Validate the new signing secret.                                                                                                  |
| `backend/src/modules/orders/order.routes.ts`                      | Replace inline hash-only token resolution with the shared resolver.                                                               |
| `backend/src/modules/payments/adapters/stripe.adapter.ts`         | Add receipt description/metadata on create plus an update helper for reused pending PaymentIntents.                               |
| `backend/src/modules/payments/payment.routes.ts`                  | Sync Stripe receipt details on intent reuse and stop queueing Swiss Mail dispatch-confirmation email from payment flows.          |
| `backend/src/modules/dispatch/dispatch-notifications.ts`          | Rehome dispatch email enqueue helpers to the shared context builder and add `dispatch-submitted`.                                 |
| `backend/src/workers/submit-dispatch.worker.ts`                   | Queue `dispatch-submitted` from dispatch ownership and stop sending `dispatch-confirmation` / same-cycle `dispatch-accepted`.     |
| `backend/src/workers/reconcile-dispatch.worker.ts`                | Send `dispatch-accepted` only on later acceptance confirmation and use signed order links.                                        |
| `backend/src/workers/email-templates.ts`                          | Remove `dispatch-confirmation`, strengthen `dispatch-submitted` and `dispatch-accepted` around status links and shared structure. |
| `backend/src/workers/email-strings.ts`                            | Update submitted/accepted copy to match the cleaned sequence.                                                                     |
| `backend/tests/env.test.ts`                                       | Require the new signing secret in valid env fixtures.                                                                             |
| `backend/tests/regression-env-validation.test.ts`                 | Keep valid env coverage passing with the new signing secret.                                                                      |
| `backend/tests/stripe-adapter.test.ts`                            | Assert `receipt_email`, order reference description, and update behavior.                                                         |
| `backend/tests/payment-checkout.routes.test.ts`                   | Assert reused pending intents are updated and payment routes no longer queue dispatch email.                                      |
| `backend/tests/payment-webhook.routes.test.ts`                    | Remove dispatch-confirmation assertions from capture-time webhook handling.                                                       |
| `backend/tests/immediate-capture-webhook.test.ts`                 | Lock the new webhook source block so it enqueues dispatch only, not customer email.                                               |
| `backend/tests/dispatch-notifications.test.ts`                    | Cover submitted/accepted queue payloads and job IDs.                                                                              |
| `backend/tests/dispatch-workers.test.ts`                          | Cover new submitted/accepted sequencing and removal of `dispatch-confirmation`.                                                   |
| `backend/tests/email-templates.test.ts`                           | Remove `dispatch-confirmation` coverage and assert consistent submitted/accepted templates with status links.                     |
| `frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx` | Keep the card but align the notice wording with Stripe receipt + later dispatch updates.                                          |
| `frontend/src/messages/en-CH.json`                                | Replace vague confirmation-email copy with payment-receipt copy.                                                                  |
| `frontend/src/messages/de-CH.json`                                | Same.                                                                                                                             |
| `frontend/src/messages/fr-CH.json`                                | Same.                                                                                                                             |
| `frontend/src/messages/it-CH.json`                                | Same.                                                                                                                             |
| `frontend/tests/confirmation-email-notice.test.ts`                | Expect payment-receipt wording.                                                                                                   |
| `frontend/tests/confirmation.test.ts`                             | Keep locale-key coverage while the copy changes.                                                                                  |
| `docs/04-product/email-flows.md`                                  | Update the launch email matrix and remove the app-level payment-receipt assumption.                                               |
| `docs/05-architecture/session-management.md`                      | Re-home order-link delivery to signed tokens usable by later dispatch emails.                                                     |
| `docs/03-ux/page-specifications.md`                               | Align the confirmation-page email notice and email sequence wording.                                                              |

### Deleted files

| File                                                    | Reason                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
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
    const { issueOrderAccessToken, verifyOrderAccessToken } =
      await import("../src/modules/orders/order-access-token.js");

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
    const { issueOrderAccessToken, verifyOrderAccessToken } =
      await import("../src/modules/orders/order-access-token.js");

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

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

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

    const { resolveOrderAccessPayment } =
      await import("../src/modules/orders/order-token-resolver.js");

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

export async function resolveOrderAccessPayment(db: Db, orderToken: string) {
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

async function resolveOrderToken(db: ReturnType<typeof getDb>, orderToken: string) {
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
