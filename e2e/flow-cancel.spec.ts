import { test, expect } from "@playwright/test";
import {
  createSession,
  createDraft,
  seedDraftContent,
  submitForReview,
  disposeSession,
  attachSessionCookie,
  type SessionContext,
} from "./helpers/api";

// ── Constants ──────────────────────────────────────────────────────────────

const LOCALE = "de-CH" as const;

/** Sample sender for test drafts. */
const SENDER = {
  firstName: "Anna",
  lastName: "Muster",
  addressLine1: "Bahnhofstrasse 1",
  postalCode: "8001",
  city: "Zürich",
  country: "CH",
};

/** Sample recipient for test drafts. */
const RECIPIENT = {
  firstName: "Bruno",
  lastName: "Beispiel",
  addressLine1: "Rue du Marché 7",
  postalCode: "1003",
  city: "Lausanne",
  country: "CH",
};

/** Draft body: short letter used for all flow tests (no AI needed). */
const LETTER_BODY =
  "Sehr geehrte Damen und Herren,\n\n" +
  "Hiermit bestätige ich den Erhalt Ihrer Sendung vom 12. Juli 2026.\n" +
  "Bitte senden Sie mir die entsprechenden Unterlagen zu.\n\n" +
  "Mit freundlichen Grüssen,\nAnna Muster";

const LETTER_SUBJECT = "Empfangsbestätigung";

// ── Helpers ────────────────────────────────────────────────────────────────

interface TestContext {
  session: SessionContext;
  draftId: string;
}

/**
 * Bootstrap a draft from scratch through the API so it reaches "reviewed" state.
 */
async function bootstrapDraftToReview(): Promise<TestContext> {
  const session = await createSession(LOCALE);
  const { draftId } = await createDraft(session);
  await seedDraftContent(session, draftId, {
    sender: SENDER,
    recipient: RECIPIENT,
    subject: LETTER_SUBJECT,
    body: LETTER_BODY,
    deliveryType: "standard",
  });
  await submitForReview(session, draftId);
  return { session, draftId };
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe("Draft flow — cancel / back from checkout", () => {
  let ctx: TestContext;

  test.beforeEach(async () => {
    ctx = await bootstrapDraftToReview();
  });

  test.afterEach(async () => {
    await disposeSession(ctx.session);
  });

  test("navigate from review → checkout → back to review preserves state", async ({
    page,
  }) => {
    // Attach the session cookie so the browser can authenticate API calls.
    await attachSessionCookie(page, ctx.session);

    // 1. Navigate directly to checkout (the review CTA may be loading a price
    //    quote which can take time in dev; skip the button and go directly).
    await page.goto(`/${LOCALE}/draft/${ctx.draftId}/checkout`, {
      waitUntil: "load",
    });
    // Wait for client-side rendering to settle
    await page.waitForTimeout(2000);

    // 2. We should now be on the checkout page
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/draft/${ctx.draftId}/checkout`));

    // 3. Click "back to review" (rendered as <Link> in the form state or
    //    <button> in the blocked/Stripe states; both say "Zurück" in de-CH).
    const backLink = page
      .getByRole("link", { name: "Zurück" })
      .or(page.getByRole("button", { name: "Zurück" }));
    await expect(backLink.first()).toBeVisible({ timeout: 10_000 });
    await backLink.first().click();

    // 4. Should be back on review page
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/draft/${ctx.draftId}/review`));

    // 5. Verify the review page shows the draft content (not an error boundary)
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Application error");

    // 6. Navigate to checkout again — should still work (state intact)
    await page.goto(`/${LOCALE}/draft/${ctx.draftId}/checkout`, {
      waitUntil: "load",
    });
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/draft/${ctx.draftId}/checkout`));
  });

  test("checkout page renders without crashing", async ({ page }) => {
    await attachSessionCookie(page, ctx.session);
    await page.goto(`/${LOCALE}/draft/${ctx.draftId}/checkout`, {
      waitUntil: "load",
    });
    await page.waitForTimeout(2000);

    // The checkout page must not crash with an error boundary, regardless of
    // whether Stripe/pricing is configured in the current environment.
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Application error");

    // In any state, there should be a "Zurück" back navigation element
    // (either a link or a button).
    const backElement = page
      .getByRole("link", { name: "Zurück" })
      .or(page.getByRole("button", { name: "Zurück" }));
    await expect(backElement.first()).toBeVisible({ timeout: 10_000 });

    // If Stripe is configured and pricing available, the email form appears.
    // Otherwise a blocked-state message is shown. Both are valid.
    const emailInput = page.getByLabel("E-Mail-Adresse");
    const blockedState = page.getByText(
      /Zahlungssystem ist nicht eingerichtet|Preis nicht verfügbar|payment/i,
    );
    const hasEmailForm = (await emailInput.count()) > 0;
    const hasBlockedMessage = (await blockedState.count()) > 0;

    if (hasEmailForm) {
      // Verify email input and consent checkbox are present
      await expect(emailInput.first()).toBeVisible();
      const consentCheckbox = page.getByRole("checkbox");
      await expect(consentCheckbox.first()).toBeVisible();
    } else {
      // Must show a blocked-state explanation (no crash)
      expect(hasBlockedMessage).toBeTruthy();
    }
  });
});

test.describe("Payment failure with Stripe test card", () => {
  let ctx: TestContext;

  test.beforeEach(async () => {
    ctx = await bootstrapDraftToReview();
  });

  test.afterEach(async () => {
    await disposeSession(ctx.session);
  });

  test("declined card shows clear error and does NOT advance to confirmation", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_ALLOW_PAYMENT,
      "Requires E2E_ALLOW_PAYMENT=1 to attempt real Stripe interactions",
    );

    await attachSessionCookie(page, ctx.session);
    await page.goto(`/${LOCALE}/draft/${ctx.draftId}/checkout`, {
      waitUntil: "load",
    });
    await page.waitForTimeout(2000);

    // Fill email (de-CH label is "E-Mail-Adresse")
    const emailInput = page.getByLabel("E-Mail-Adresse");
    await emailInput.first().fill("e2e-declined@example.com");

    // Check consent
    const consentCheckbox = page.getByRole("checkbox");
    await consentCheckbox.first().check();

    // Click continue to payment (de-CH label is "Weiter")
    const continueBtn = page.getByRole("button", {
      name: /Weiter|Continue|Fortfahren|payment/i,
    });
    await continueBtn.first().click();

    // Wait for Stripe PaymentElement iframe to load
    const stripeFrame = page.frameLocator(
      'iframe[src*="stripe.com"], iframe[src*="js.stripe.com"], iframe[title*="Secure payment"]',
    );

    // Fill card number 4000 0000 0000 0002 (declined card)
    const cardNumberInput = stripeFrame
      .getByPlaceholder(/card number|Kartennummer|numéro de carte/i)
      .or(stripeFrame.locator('[data-elements-stable-field-name="cardNumber"]'))
      .or(stripeFrame.locator('input[name="cardnumber"]'));
    await cardNumberInput.first().fill("4000000000000002");

    // Fill expiry
    const expiryInput = stripeFrame
      .getByPlaceholder(/MM\s*\/\s*YY|MM\/JJ/i)
      .or(stripeFrame.locator('[data-elements-stable-field-name="cardExpiry"]'))
      .or(stripeFrame.locator('input[name="exp-date"]'));
    await expiryInput.first().fill("12/30");

    // Fill CVC
    const cvcInput = stripeFrame
      .getByPlaceholder(/CVC|CVC\/CVV|Prüfnummer/i)
      .or(stripeFrame.locator('[data-elements-stable-field-name="cardCvc"]'))
      .or(stripeFrame.locator('input[name="cvc"]'));
    await cvcInput.first().fill("123");

    // Submit the payment form (de-CH label is "Bezahlen")
    const payButton = page.getByRole("button", {
      name: /Bezahlen|send|senden|payer|zahl/i,
    });
    await payButton.first().click();

    // Wait for the error to appear
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert.first()).toBeVisible({ timeout: 15_000 });

    // Verify the error message is visible and not empty
    const errorText = await errorAlert.first().textContent();
    expect(errorText?.trim().length).toBeGreaterThan(0);

    // Verify we are still on the checkout page (NOT redirected to confirmation)
    await expect(page).not.toHaveURL(/\/confirmation/);
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/draft/${ctx.draftId}/checkout`));
  });

  test("happy path (successful payment) — skipped by default", async () => {
    test.skip(
      !process.env.E2E_ALLOW_PAYMENT,
      "SKIPPED: Successful payment dispatches real email (Resend) and creates " +
        "dispatch jobs against the stub postal provider. To run this test, set " +
        "E2E_ALLOW_PAYMENT=1 and use a throwaway email address. Use Stripe test " +
        "card 4242 4242 4242 4242 for success. This test is gated to prevent " +
        "accidental side effects during development.",
    );

    // Placeholder: implement full happy-path flow here when E2E_ALLOW_PAYMENT=1.
    // (Gated by the test.skip above to avoid real email/dispatch side effects.)
  });
});
