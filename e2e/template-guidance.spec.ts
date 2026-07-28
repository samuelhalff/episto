import { expect, test, type Page } from "@playwright/test";

import {
  attachSessionCookie,
  createSession,
  disposeSession,
  type SessionContext,
} from "./helpers/api";

/**
 * The template flow, exercised the way a user meets it: click a template on a
 * landing page, land in the workspace, see what is steering the draft, and turn
 * it off.
 *
 * Everything here is deliberately checked in a real browser. The unit suite
 * already mounts these components; what it cannot show is that the workspace
 * actually reaches this state after the `/draft/new?template=` redirect, that
 * the write survives a reload, and that the guidance is visible on a phone.
 *
 * No AI turn is triggered: the composer is never sent. That keeps the test
 * usable against production, where the model is billed and the post is real.
 */

const SLUG = "wohnung-kuendigen";
const TEMPLATE_TITLE = "Wohnung kündigen";
const TURN_OFF = "Vorlagenhilfe ausschalten";
const PREPARE_TITLE = "Das haben Sie idealerweise zur Hand";
const STARTER_CLEARED =
  "Vorlagenhilfe ausgeschaltet – der vorbereitete Einstiegssatz wurde entfernt.";
const TEXT_KEPT = "Vorlagenhilfe ausgeschaltet – Ihr Text bleibt unverändert.";

// Matched across locales: the placeholder is translated, and pinning the German
// one makes any test that switches language fail on the locator rather than on
// the thing it is checking.
const composer = (page: Page) =>
  page.getByPlaceholder(/Ich möchte mein Internet|I want to cancel my Swisscom/);

/**
 * Draft creation is capped at 20/hour/IP (each draft can trigger AI cost), and
 * this file spends one per test. Over the cap the app renders its generic error
 * page and `waitForURL` just times out 30s later, pointing at the assertion
 * instead of the cause — so the rate limit is named explicitly.
 */
async function failFastOnRateLimit(page: Page): Promise<void> {
  const tooManyAttempts = page.getByText(/Too many attempts|Zu viele Versuche/);
  if ((await tooManyAttempts.count()) > 0) {
    throw new Error(
      "Draft creation was rate-limited (20/hour/IP). This is the environment, " +
        "not a regression — wait out the window before re-running.",
    );
  }
}

/**
 * Enters the product the way the landing CTA does and waits for the workspace
 * to settle on the draft it created.
 */
async function openDraft(page: Page, query = ""): Promise<string> {
  await page.goto(`/de-CH/draft/new${query}`);
  await Promise.race([
    page.waitForURL(/\/draft\/[0-9a-f-]{36}/, { timeout: 30_000 }),
    page
      .getByText(/Too many attempts|Zu viele Versuche/)
      .waitFor({ timeout: 30_000 })
      .then(() => {}),
  ]).catch(() => {});
  await failFastOnRateLimit(page);
  await page.waitForURL(/\/draft\/[0-9a-f-]{36}/, { timeout: 30_000 });
  await expect(composer(page)).toBeVisible();
  return page.url().split("/draft/")[1].split(/[?#]/)[0];
}

const openWorkspaceFromTemplate = (page: Page) => openDraft(page, `?template=${SLUG}`);

test.describe("template guidance in the workspace", () => {
  let session: SessionContext;

  test.beforeEach(async ({ page }) => {
    session = await createSession("de-CH");
    await attachSessionCookie(page, session);
  });

  test.afterEach(async () => {
    await disposeSession(session);
  });

  // US-1 / US-2 / US-3: the template is visible, says what to have ready, and
  // blocks nothing.
  test("shows what the template prepared, without gating the composer", async ({
    page,
  }) => {
    await openWorkspaceFromTemplate(page);

    await expect(page.getByText(TEMPLATE_TITLE, { exact: true })).toBeVisible();
    await expect(page.getByText(PREPARE_TITLE)).toBeVisible();
    await expect(page.getByText("Der Mietvertrag")).toBeVisible();

    // US-3: nothing about the panel may disable the composer.
    await expect(composer(page)).toBeEnabled();
    await composer(page).click();
    await expect(composer(page)).toBeFocused();
  });

  // US-5 / US-5a: turning guidance off removes the untouched starter with it,
  // and says so.
  test("turns guidance off and clears the untouched starter", async ({ page }) => {
    await openWorkspaceFromTemplate(page);
    await expect(composer(page)).not.toBeEmpty();

    await page.getByRole("button", { name: TURN_OFF }).first().click();

    await expect(page.getByText(STARTER_CLEARED)).toBeVisible();
    await expect(composer(page)).toBeEmpty();
    await expect(page.getByText(PREPARE_TITLE)).toBeHidden();
  });

  // US-5a, the other branch: text the user made their own is never deleted.
  test("keeps text the user edited when guidance is turned off", async ({ page }) => {
    await openWorkspaceFromTemplate(page);
    await composer(page).click();
    await composer(page).press("End");
    await composer(page).type(" Der Vermieter heisst Muster AG.");

    await page.getByRole("button", { name: TURN_OFF }).first().click();

    await expect(page.getByText(TEXT_KEPT)).toBeVisible();
    await expect(composer(page)).toContainText("Muster AG");
  });

  // US-5b: the write is what matters, not the optimistic UI. A reload is the
  // only honest check that guidance actually stopped reaching the model.
  test("turning it off survives a reload", async ({ page }) => {
    const draftId = await openWorkspaceFromTemplate(page);

    await page.getByRole("button", { name: TURN_OFF }).first().click();
    await expect(page.getByText(STARTER_CLEARED)).toBeVisible();

    await page.goto(`/de-CH/draft/${draftId}`);
    await expect(composer(page)).toBeVisible();
    await expect(page.getByText(TEMPLATE_TITLE, { exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: TURN_OFF })).toHaveCount(0);
  });

  // US-7: a cold draft must not claim a template is steering it.
  test("shows no template surface on a cold start", async ({ page }) => {
    await openDraft(page);

    await expect(composer(page)).toBeVisible();
    await expect(page.getByRole("button", { name: TURN_OFF })).toHaveCount(0);
  });

  // US-1 on the smaller half of the traffic. The panel is the first thing above
  // the composer, so a mobile regression hides it entirely rather than degrading.
  test("is reachable on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspaceFromTemplate(page);

    await expect(page.getByText(TEMPLATE_TITLE, { exact: true })).toBeVisible();
    const turnOff = page.getByRole("button", { name: TURN_OFF }).first();
    await expect(turnOff).toBeVisible();
    // Visible is not the same as reachable: a panel that renders off-canvas or
    // under the composer still fails the user.
    const box = await turnOff.boundingBox();
    if (!box) throw new Error("turn-off control has no layout box");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});

/**
 * US-8: a draft can carry a template slug into a locale that has no authored
 * copy for it. This is reached by *switching* locale, not by entering in en-CH:
 * `/en-CH/draft/new?template=` builds no `templateContext` at all, because that
 * is derived from the landing page and en-CH has none — so nothing is applied
 * and there is correctly nothing to show.
 *
 * The switch is the case that matters. Guidance is already in metadata and still
 * reaches the model, so the chip must keep naming it and offering the off
 * switch, even with no title to show.
 */
test.describe("template guidance carried into a locale with no copy", () => {
  test("still names and can stop the template after a switch to en-CH", async ({
    page,
  }) => {
    const session = await createSession("de-CH");
    await attachSessionCookie(page, session);

    const draftId = await openWorkspaceFromTemplate(page);
    await expect(page.getByText(TEMPLATE_TITLE, { exact: true })).toBeVisible();

    await page.goto(`/en-CH/draft/${draftId}`);
    await expect(composer(page)).toBeVisible();

    // No authored title in this locale, so the chip falls back to saying only
    // that a template is active — which is true everywhere.
    await expect(page.getByText("Template active")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Turn off template guidance" }).first(),
    ).toBeVisible();

    await disposeSession(session);
  });
});
