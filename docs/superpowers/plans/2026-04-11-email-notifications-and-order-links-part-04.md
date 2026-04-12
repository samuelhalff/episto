# Email Notifications and Order Links Implementation Plan — Part 4

> Split from [2026-04-11-email-notifications-and-order-links.md](2026-04-11-email-notifications-and-order-links.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Task 6: Align frontend receipt copy and canonical docs
- Task 7: Verify the integrated behavior

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
  expect(screen.getByText("A payment receipt has been sent to your email")).toBeTruthy();
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
