# Email Notifications and Order Links Implementation Plan — Part 3

> Split from [2026-04-11-email-notifications-and-order-links.md](2026-04-11-email-notifications-and-order-links.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Task 4: Build one shared dispatch email context and remove the old confirmation template
- Task 5: Rewire notification ownership to dispatch state transitions

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

  const { enqueueDispatchSubmittedEmail } =
    await import("../src/modules/dispatch/dispatch-notifications.js");

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
  value: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  } | null,
): string {
  return (
    [value?.firstName, value?.lastName].filter(Boolean).join(" ").trim() ||
    value?.company?.trim() ||
    ""
  );
}

export async function buildDispatchEmailContext(
  db: Db,
  args: { draftId: string; paymentId: string },
) {
  const [[payment], [draft]] = await Promise.all([
    db
      .select()
      .from(schema.paymentAttempts)
      .where(eq(schema.paymentAttempts.id, args.paymentId))
      .limit(1),
    db
      .select()
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, args.draftId))
      .limit(1),
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
