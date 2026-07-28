import type { APIRequestContext, APIResponse, Page } from "@playwright/test";

/**
 * Base URL for the Episto API (behind nginx proxy).
 * Override with E2E_API_URL env var.
 */
const API_BASE = process.env.E2E_API_URL || "http://localhost:5000/api";

/**
 * Throw if the API response status does not match `expectedStatus`.
 * Always drains the body to avoid connection leaks.
 */
async function assertStatus(
  response: APIResponse,
  expectedStatus: number,
  label: string,
): Promise<void> {
  if (response.status() !== expectedStatus) {
    let body = "";
    try {
      body = JSON.stringify(await response.json());
    } catch {
      body = await response.text();
    }
    throw new Error(
      `${label}: expected ${expectedStatus}, got ${response.status()} — ${body.slice(0, 500)}`,
    );
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export type Locale = "de-CH" | "fr-CH" | "it-CH" | "en-CH";

export interface SessionContext {
  /** The Playwright APIRequestContext with session cookie set. */
  request: APIRequestContext;
  /** Session id returned by the server. */
  sessionId: string;
  /** Resolved locale for the session. */
  locale: Locale;
  /** Cookie header value (for manual reuse across contexts). */
  cookieHeader: string;
}

export interface SenderInput {
  firstName: string;
  lastName: string;
  company?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country?: string;
}

export interface RecipientInput {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  department?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country?: string;
}

export interface DraftSeed {
  sender: SenderInput;
  recipient: RecipientInput;
  subject: string;
  body: string;
  deliveryType?: "standard" | "registered";
}

export interface DraftContext {
  draftId: string;
  locale: Locale;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create an ephemeral APIRequestContext with no base cookie jar.
 */
async function freshApiContext(): Promise<APIRequestContext> {
  const { request } = await import("@playwright/test");
  return request.newContext({
    baseURL: API_BASE,
    // Backend CSRF guard rejects /api calls without this header (403).
    extraHTTPHeaders: { "X-Requested-With": "XMLHttpRequest" },
  });
}

/**
 * POST /api/v1/sessions — create a new anonymous session for `locale`.
 * Returns a new APIRequestContext with the session cookie baked in.
 */
export async function createSession(locale: Locale = "de-CH"): Promise<SessionContext> {
  const ctx = await freshApiContext();
  const res = await ctx.post(`${API_BASE}/v1/sessions`, {
    data: { locale },
  });
  await assertStatus(res, 200, "createSession");
  const body = await res.json();
  const sessionId: string = body.session?.id;
  if (!sessionId) throw new Error("createSession: no session.id in response");

  // Extract the Set-Cookie header
  const setCookie = res.headers()["set-cookie"];
  const cookieHeader = setCookie ?? "";

  // Create a new context with the session cookie pre-set
  const cookieName = resolveCookieName();
  // Parse the raw cookie value from the header
  const cookieValue = extractCookieValue(cookieHeader, cookieName);

  return {
    request: ctx,
    sessionId,
    locale,
    cookieHeader: `${cookieName}=${cookieValue}`,
  };
}

/**
 * Create a new APIRequestContext pre-configured with the session cookie
 * from an existing SessionContext. Creates a fresh context on each call
 * so the caller controls lifecycle via dispose().
 */
async function ctxWithCookie(ctx: SessionContext): Promise<APIRequestContext> {
  const { request } = await import("@playwright/test");
  // Parse the cookie name and value
  const [name, ...valueParts] = ctx.cookieHeader.split("=");
  const value = valueParts.join("=").split(";")[0];
  // Create context with storageState
  const newCtx = await request.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: {
      Cookie: `${name}=${value}`,
      // Backend CSRF guard rejects /api calls without this header (403).
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  return newCtx;
}

function extractCookieValue(header: string, name: string): string {
  // Parse Set-Cookie header without regex to avoid injection from cookie name.
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

/**
 * The cookie name is a property of the *target*, not of the machine running the
 * tests: the backend issues `__Host-session` over https and `session` otherwise.
 * Deriving it from the runner's own NODE_ENV, as this used to, silently produced
 * an empty cookie whenever the two disagreed — every authenticated navigation
 * then failed as if the app were broken.
 */
function resolveCookieName(): string {
  return API_BASE.startsWith("https://") ? "__Host-session" : "session";
}

/**
 * POST /api/v1/drafts — create a new draft for the session.
 */
export async function createDraft(ctx: SessionContext): Promise<DraftContext> {
  const reqCtx = await ctxWithCookie(ctx);
  const res = await reqCtx.post(`${API_BASE}/v1/drafts`);
  await assertStatus(res, 201, "createDraft");
  const body = await res.json();
  const draftId: string = body.draft?.id;
  if (!draftId) throw new Error("createDraft: no draft.id in response");
  await reqCtx.dispose();
  return { draftId, locale: ctx.locale };
}

/**
 * Seed a draft with sender, recipient, subject, body, and deliveryType
 * via the real API so the draft reaches "fields_complete" status.
 *
 * This bypasses AI drafting entirely — we write the letter content directly.
 */
export async function seedDraftContent(
  ctx: SessionContext,
  draftId: string,
  seed: DraftSeed,
): Promise<void> {
  const reqCtx = await ctxWithCookie(ctx);

  // 1. Set sender (PUT /drafts/:draftId/sender)
  const senderRes = await reqCtx.put(`${API_BASE}/v1/drafts/${draftId}/sender`, {
    data: {
      firstName: seed.sender.firstName,
      lastName: seed.sender.lastName,
      company: seed.sender.company ?? null,
      addressLine1: seed.sender.addressLine1,
      addressLine2: seed.sender.addressLine2 ?? null,
      postalCode: seed.sender.postalCode,
      city: seed.sender.city,
      country: seed.sender.country ?? "CH",
    },
  });
  await assertStatus(senderRes, 200, "seedDraftContent: sender");

  // 2. Set recipient (PUT /drafts/:draftId/recipient)
  const recipientRes = await reqCtx.put(`${API_BASE}/v1/drafts/${draftId}/recipient`, {
    data: {
      firstName: seed.recipient.firstName ?? null,
      lastName: seed.recipient.lastName ?? null,
      company: seed.recipient.company ?? null,
      department: seed.recipient.department ?? null,
      addressLine1: seed.recipient.addressLine1,
      addressLine2: seed.recipient.addressLine2 ?? null,
      postalCode: seed.recipient.postalCode,
      city: seed.recipient.city,
      country: seed.recipient.country ?? "CH",
    },
  });
  await assertStatus(recipientRes, 200, "seedDraftContent: recipient");

  // 3. Set subject, body, deliveryType (PATCH /drafts/:draftId)
  const patchRes = await reqCtx.patch(`${API_BASE}/v1/drafts/${draftId}`, {
    data: {
      subject: seed.subject,
      body: seed.body,
      deliveryType: seed.deliveryType ?? "standard",
      // Unlock all workspace steps (incl. attachments) so UI-driven tests can
      // reach any step without walking the AI-gated flow. furthestUnlockedStepIndex
      // max is 6 (see shared/src/workspace-draft.ts).
      //
      // Sent as a delta: `metadata` is no longer accepted on this route, and a
      // body that still used it would be silently dropped — leaving the steps
      // locked and every UI-driven test failing somewhere far from the cause.
      workspacePatch: { furthestUnlockedStepIndex: 6 },
    },
  });
  await assertStatus(patchRes, 200, "seedDraftContent: patch");

  await reqCtx.dispose();
}

/**
 * POST /api/v1/drafts/:draftId/review — submit the draft for review,
 * creating an immutable snapshot.
 */
export async function submitForReview(
  ctx: SessionContext,
  draftId: string,
): Promise<void> {
  const reqCtx = await ctxWithCookie(ctx);
  const res = await reqCtx.post(`${API_BASE}/v1/drafts/${draftId}/review`);
  await assertStatus(res, 201, "submitForReview");
  await reqCtx.dispose();
}

/**
 * Clean up by disposing the session's API context.
 */
export async function disposeSession(ctx: SessionContext): Promise<void> {
  await ctx.request.dispose();
}

/**
 * Set the session cookie on a Playwright Page's browser context so that
 * UI navigation to authenticated routes (draft pages) works.
 *
 * Must be called AFTER createSession and BEFORE any page.goto() to a
 * draft-specific route.
 */
export async function attachSessionCookie(
  page: Page,
  ctx: SessionContext,
): Promise<void> {
  const [name, ...valueParts] = ctx.cookieHeader.split("=");
  const value = valueParts.join("=").split(";")[0];
  // Addressed by `url` rather than domain/path: the `__Host-` prefix a https
  // target uses forbids a Domain attribute, so a hardcoded `domain: "localhost"`
  // both pins the suite to local and produces a cookie the browser rejects.
  await page.context().addCookies([
    {
      name,
      value,
      url: new URL("/", process.env.E2E_BASE_URL || "http://localhost:5000").toString(),
      httpOnly: true,
      secure: API_BASE.startsWith("https://"),
      sameSite: "Lax" as const,
    },
  ]);
}
