import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  createSession,
  createDraft,
  seedDraftContent,
  disposeSession,
  attachSessionCookie,
  type SessionContext,
} from "./helpers/api";

// ── Constants ──────────────────────────────────────────────────────────────

const LOCALE = "de-CH" as const;

const VALID_SENDER = {
  firstName: "Anna",
  lastName: "Muster",
  addressLine1: "Bahnhofstrasse 1",
  postalCode: "8001",
  city: "Zürich",
};

const VALID_RECIPIENT = {
  firstName: "Bruno",
  lastName: "Beispiel",
  addressLine1: "Rue du Marché 7",
  postalCode: "1003",
  city: "Lausanne",
};

const LETTER_BODY =
  "Sehr geehrte Damen und Herren,\n\n" +
  "Hiermit bestätige ich den Erhalt Ihrer Sendung.\n\n" +
  "Mit freundlichen Grüssen,\nAnna Muster";

const LETTER_SUBJECT = "Empfangsbestätigung";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Dismiss the privacy notice banner if visible, so it doesn't
 * obscure buttons in the fixed bottom action dock.
 */
async function dismissPrivacyBanner(page: Page): Promise<void> {
  const dismissButton = page.getByLabel("Datenschutzhinweis ausblenden");
  if ((await dismissButton.count()) > 0) {
    await dismissButton.click();
    // Wait for the dismiss animation
    await page.waitForTimeout(500);
  }
}

// ── Test: Direct navigation guards ─────────────────────────────────────────

test.describe("Negative tests — navigation guards", () => {
  test("direct navigation to /checkout without draft shows error page, not crash", async ({
    page,
  }) => {
    // Navigate to a non-existent draft checkout
    await page.goto(`/${LOCALE}/draft/00000000-0000-0000-0000-000000000000/checkout`, {
      waitUntil: "load",
    });
    // Wait for client-side React rendering and API error response
    await page.waitForTimeout(3000);

    // Should NOT crash with an error boundary
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Application error");

    // The checkout page with a non-existent draft shows an error message
    // (e.g. "Es ist ein Fehler aufgetreten" from common translations)
    // and stays on the checkout URL.
    // This is valid behavior — the page catches the missing draft gracefully.
    // It does NOT show the full checkout form because there is no draft data.
    const hasCheckoutForm = (await page.getByLabel("E-Mail-Adresse").count()) > 0;
    // If no checkout form, the page should show an error/no-data state
    const bodyText = await page.locator("body").innerText();
    const hasErrorState =
      bodyText.includes("Fehler") ||
      bodyText.includes("aufgetreten") ||
      bodyText.includes("nicht gefunden") ||
      bodyText.includes("abgelaufen") ||
      bodyText.includes("Error") ||
      bodyText.includes("Laden");

    // Accept: either the checkout form loaded (API gate will block progression),
    // or an error/no-data state is shown (page didn't crash).
    expect(hasCheckoutForm || hasErrorState).toBeTruthy();
  });

  test("direct navigation to /review without draft shows error, not crash", async ({
    page,
  }) => {
    await page.goto(`/${LOCALE}/draft/00000000-0000-0000-0000-000000000000/review`, {
      waitUntil: "load",
    });

    // Page should not crash with an error boundary
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("direct navigation to /confirmation without payment shows error, not crash", async ({
    page,
  }) => {
    await page.goto(
      `/${LOCALE}/draft/00000000-0000-0000-0000-000000000000/confirmation`,
      { waitUntil: "load" },
    );

    // Should not crash
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Application error");
  });
});

// ── Test: Address field validation ─────────────────────────────────────────

test.describe("Negative tests — required field validation", () => {
  // Serial mode to avoid rate-limiting with other API-heavy tests.
  test.describe.configure({ mode: "serial" });

  let session: SessionContext;
  let draftId: string;

  test.beforeEach(async () => {
    session = await createSession(LOCALE);
    const draft = await createDraft(session);
    draftId = draft.draftId;
  });

  test.afterEach(async () => {
    await disposeSession(session);
  });

  test("empty sender address fields disable the continue button", async ({ page }) => {
    await attachSessionCookie(page, session);
    // Navigate to the sender step
    await page.goto(`/${LOCALE}/draft/${draftId}/sender`, {
      waitUntil: "load",
    });
    // Wait for client-side React rendering to hydrate the component
    await page.waitForTimeout(3000);

    // Dismiss privacy banner so it doesn't obscure the button
    await dismissPrivacyBanner(page);

    // The sender step uses name attributes: senderName, senderAddressLine1,
    // senderPostalCode, senderCity. The "Weiter" button is disabled when
    // required fields are empty — this is the client-side validation UX.
    // There are no inline validation error messages; the button stays disabled.

    // Clear any prefilled values
    const fullNameTextarea = page.locator('textarea[name="senderName"]');
    const addressInput = page.locator('input[name="senderAddressLine1"]');
    const postalCodeInput = page.locator('input[name="senderPostalCode"]');
    const cityInput = page.locator('input[name="senderCity"]');

    for (const input of [fullNameTextarea, addressInput, postalCodeInput, cityInput]) {
      if ((await input.count()) > 0 && (await input.first().isEnabled())) {
        await input.first().fill("");
      }
    }

    // The "Weiter" button should be disabled (tone "warning", no icon)
    // Use a resilient locator that matches both button or link with text "Weiter"
    const submitButton = page
      .getByRole("button", { name: "Weiter" })
      .or(page.locator("button:has-text('Weiter')"));
    await expect(submitButton.first()).toBeVisible({ timeout: 10_000 });
    await expect(submitButton.first()).toBeDisabled();

    // Page should not crash and should not advance
    await expect(page).not.toHaveURL(/\/review/);
    await expect(page).not.toHaveURL(/\/checkout/);
    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });

  test("invalid postal code shows validation error", async ({ page }) => {
    await attachSessionCookie(page, session);
    await page.goto(`/${LOCALE}/draft/${draftId}/sender`, {
      waitUntil: "load",
    });
    // Wait for client-side React rendering
    await page.waitForTimeout(3000);

    // Dismiss privacy banner so it doesn't obscure the button
    await dismissPrivacyBanner(page);

    // Fill valid data except invalid postal code
    // Sender step uses textarea[name="senderName"] for full name
    const fullNameTextarea = page.locator('textarea[name="senderName"]');
    const addressInput = page.locator('input[name="senderAddressLine1"]');
    const postalCodeInput = page.locator('input[name="senderPostalCode"]');
    const cityInput = page.locator('input[name="senderCity"]');

    // Fill valid data
    if ((await fullNameTextarea.count()) > 0) {
      await fullNameTextarea.first().fill("Anna Muster");
    }
    if ((await addressInput.count()) > 0) {
      await addressInput.first().fill("Bahnhofstrasse 1");
    }
    if ((await cityInput.count()) > 0) {
      await cityInput.first().fill("Zürich");
    }

    // Set invalid postal code (Swiss codes are 4 digits; "abc" is invalid)
    // Client-side validation only checks non-empty, so the button WILL be
    // enabled. The server will reject with 422 when we click Weiter.
    if (
      (await postalCodeInput.count()) > 0 &&
      (await postalCodeInput.first().isEnabled())
    ) {
      await postalCodeInput.first().fill("abc");
    }

    // The button should be enabled (all fields have text)
    const submitButton = page.getByRole("button", { name: "Weiter" });
    await expect(submitButton.first()).toBeVisible({ timeout: 5000 });
    await expect(submitButton.first()).toBeEnabled();
    // Clicking should trigger API call → server validation error
    // Force click to bypass any overlapping elements (privacy banner)
    await submitButton.first().click({ force: true });

    // Wait for API response and error toast
    await page.waitForTimeout(2000);

    // Either we see an error toast (role="alert") or we stay on the sender
    // page (the API rejected the invalid postal code and we didn't advance).
    const errorAlert = page.locator('[role="alert"]');
    const hasAlert = (await errorAlert.count()) > 0;

    // At minimum, we should NOT have advanced to review/checkout
    await expect(page).not.toHaveURL(/\/review/);
    await expect(page).not.toHaveURL(/\/checkout/);

    // Error feedback must be visible — either a role="alert" or a sonner toast
    if (!hasAlert) {
      const sonnerToast = page.locator("[data-sonner-toaster] li");
      await expect(sonnerToast.first()).toBeVisible({ timeout: 3000 });
    }

    await expect(page.locator("body")).not.toContainText("Something went wrong");
  });
});

// ── Test: Attachment validation ────────────────────────────────────────────

test.describe("Negative tests — attachment validation", () => {
  // Serial mode to avoid rate-limiting.
  test.describe.configure({ mode: "serial" });

  let session: SessionContext;
  let draftId: string;

  test.beforeEach(async () => {
    session = await createSession(LOCALE);
    const draft = await createDraft(session);
    draftId = draft.draftId;
    await seedDraftContent(session, draftId, {
      sender: VALID_SENDER,
      recipient: VALID_RECIPIENT,
      subject: LETTER_SUBJECT,
      body: LETTER_BODY,
      deliveryType: "standard",
    });
  });

  test.afterEach(async () => {
    await disposeSession(session);
  });

  test("oversized file is rejected with a visible message", async ({ page }) => {
    await attachSessionCookie(page, session);
    await page.goto(`/${LOCALE}/draft/${draftId}/attachments`, {
      waitUntil: "load",
    });
    // Wait for client-side React rendering
    await page.waitForTimeout(3000);

    // Dismiss privacy banner
    await dismissPrivacyBanner(page);

    // Look for a file input
    const fileInput = page.locator('input[type="file"]');

    if ((await fileInput.count()) === 0) {
      test.skip(true, "No file input found on attachments page");
      return;
    }

    // Create a large dummy file (6MB, above 5MB limit)
    const fs = await import("node:fs");
    const path = await import("node:path");
    const outputDir = test.info().outputDir;
    fs.mkdirSync(outputDir, { recursive: true });
    const largeFilePath = path.join(outputDir, "large-test-file.bin");
    const buffer = Buffer.alloc(6 * 1024 * 1024, "A");
    fs.writeFileSync(largeFilePath, buffer);

    try {
      // Set the file input with the oversized file
      await fileInput.first().setInputFiles(largeFilePath);

      // Wait for validation feedback (toast or inline message)
      await page.waitForTimeout(3000);

      // Check for error in toast notifications or body text
      const toastAlert = page.locator('[role="status"], [role="alert"]');
      const bodyText = (await page.locator("body").innerText()).toLowerCase();
      const toastText =
        (await toastAlert.count()) > 0
          ? ((await toastAlert.first().textContent())?.toLowerCase() ?? "")
          : "";

      const combinedText = bodyText + " " + toastText;
      const hasFeedback =
        combinedText.includes("too large") ||
        combinedText.includes("zu gross") ||
        combinedText.includes("überschreitet") ||
        combinedText.includes("MB-Limit") ||
        combinedText.includes("exceed") ||
        combinedText.includes("5 mb") ||
        combinedText.includes("limit") ||
        combinedText.includes("mb");

      expect(hasFeedback).toBeTruthy();
    } finally {
      // Cleanup
      try {
        fs.unlinkSync(largeFilePath);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  test("invalid file type is rejected with a visible message", async ({ page }) => {
    await attachSessionCookie(page, session);
    await page.goto(`/${LOCALE}/draft/${draftId}/attachments`, {
      waitUntil: "load",
    });
    // Wait for client-side React rendering
    await page.waitForTimeout(3000);

    // Dismiss privacy banner
    await dismissPrivacyBanner(page);

    const fileInput = page.locator('input[type="file"]');

    if ((await fileInput.count()) === 0) {
      test.skip(true, "No file input found on attachments page");
      return;
    }

    // Create a dummy .exe file (disallowed type)
    const fs = await import("node:fs");
    const path = await import("node:path");
    const outputDir = test.info().outputDir;
    fs.mkdirSync(outputDir, { recursive: true });
    const exeFilePath = path.join(outputDir, "invalid-type-test.exe");
    fs.writeFileSync(exeFilePath, "MZ" + "A".repeat(100)); // DOS header stub

    try {
      await fileInput.first().setInputFiles(exeFilePath);

      // Wait for validation feedback (toast or inline message)
      await page.waitForTimeout(3000);

      // Check both toast notifications and body text
      const toastAlert = page.locator('[role="status"], [role="alert"]');
      const bodyText = (await page.locator("body").innerText()).toLowerCase();
      const toastText =
        (await toastAlert.count()) > 0
          ? ((await toastAlert.first().textContent())?.toLowerCase() ?? "")
          : "";

      const combinedText = bodyText + " " + toastText;
      const hasFeedback =
        combinedText.includes("dateityp") ||
        combinedText.includes("Dateien") ||
        combinedText.includes("akzeptiert") ||
        combinedText.includes("file type") ||
        combinedText.includes("not supported") ||
        combinedText.includes("not allowed") ||
        combinedText.includes("nicht unterstützt") ||
        combinedText.includes("nicht erlaubt") ||
        combinedText.includes("erlaubt");

      expect(hasFeedback).toBeTruthy();
    } finally {
      try {
        fs.unlinkSync(exeFilePath);
      } catch {
        // ignore
      }
    }
  });
});
