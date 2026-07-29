/**
 * Server-side GA4 `purchase`, sent from the point capture is recorded.
 *
 * The confirmation page already fires a client-side `purchase`. It fires only
 * for a customer who granted analytics consent, runs no blocker, and stays on
 * the page long enough for the effect to mount — so every other paying customer
 * is revenue GA4 never sees. That gap is invisible in the reports, which is what
 * makes it dangerous: channel CAC is computed against an under-count of unknown
 * size, and the business runs at a max CAC of about CHF 2.30.
 *
 * The two events are the same conversion, not two conversions. GA4 de-duplicates
 * ecommerce events on `transaction_id`, so this module MUST send the same order
 * reference the browser sends (`buildOrderReference(draftId)`); if the two ever
 * drift, revenue doubles rather than stabilises.
 */

import { buildOrderReference } from "@episto/shared";

import { env, isEnvLoaded } from "../../shared/config/index.js";
import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("ga4-measurement-protocol");

const MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

/** How long we wait before abandoning the send. See sendPurchase below. */
const MP_TIMEOUT_MS = 3000;

export interface Ga4PurchaseInput {
  /** Draft the order belongs to; the order reference is derived from it. */
  draftId: string;
  /**
   * GA4 client id parsed from the visitor's `_ga` cookie. Null when the visitor
   * never granted analytics consent, in which case nothing is sent.
   */
  gaClientId: string | null;
  valueCents: number;
  currency: string;
}

export type Ga4Transport = (url: string, body: string) => Promise<void>;

let transport: Ga4Transport | null = null;

/**
 * Swap the network layer. Tests inject a recorder so an assertion about the
 * payload never reaches Google — a test run must not write into the property
 * the business reads its revenue from.
 */
export function setGa4Transport(next: Ga4Transport | null): void {
  transport = next;
}

async function defaultTransport(url: string, body: string): Promise<void> {
  // Belt and braces alongside setGa4Transport: if a test ever configures the
  // GA4 env vars and forgets to inject a transport, it still must not hit the
  // live endpoint.
  if (process.env.NODE_ENV === "test") return;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, MP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: controller.signal,
    });
    // The Measurement Protocol accepts almost anything with a 2xx and validates
    // nothing, so a non-2xx means the request itself was rejected (bad secret,
    // wrong stream) and is worth a line in the log.
    if (!response.ok) {
      throw new Error(`GA4 Measurement Protocol responded ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function credentials(): { measurementId: string; apiSecret: string } | null {
  // Reading through isEnvLoaded keeps this usable from a worker or a script
  // that never boots the Fastify app, matching how the rest of the backend
  // guards optional config.
  if (!isEnvLoaded()) return null;
  const { GA4_MEASUREMENT_ID: measurementId, GA4_API_SECRET: apiSecret } = env();
  if (!measurementId || !apiSecret) return null;
  return { measurementId, apiSecret };
}

/**
 * Whether a server-side purchase would be sent for this input.
 *
 * Exported so call sites and tests can reason about the decision without
 * performing it.
 */
export function shouldSendGa4Purchase(gaClientId: string | null): boolean {
  return Boolean(gaClientId) && credentials() !== null;
}

function buildPayload(input: Ga4PurchaseInput, gaClientId: string): string {
  return JSON.stringify({
    client_id: gaClientId,
    // Server-side sends have no page context to date the hit, and GA4 rejects
    // events with no plausible session. Letting GA4 stamp its own timestamp is
    // correct here: capture happens within seconds of the browser leaving.
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: buildOrderReference(input.draftId),
          value: input.valueCents / 100,
          currency: input.currency,
          // Marks the hit as ours in GA4's debug/exploration views, so a
          // duplicate-looking purchase can be traced to the right emitter.
          source_surface: "server",
        },
      },
    ],
  });
}

/**
 * Fire-and-forget the purchase. Never throws, never awaits anything the caller
 * cares about.
 *
 * This runs on the payment capture path. A slow or broken analytics endpoint
 * must not delay a capture, and must certainly not fail one — an exception here
 * would leave a charged customer with an unrecorded order. Hence the same
 * `void ... .catch(log)` shape the receipt issuance on this path already uses,
 * plus a hard timeout so an endpoint that accepts the connection and then hangs
 * cannot pin an open socket for the life of the process.
 */
export function sendGa4Purchase(input: Ga4PurchaseInput): void {
  try {
    dispatchPurchase(input);
  } catch (err: unknown) {
    // The synchronous half — reading config, building the payload — has no
    // business throwing, but it runs inline on the capture path, so a bug here
    // would abort a webhook and leave a charged customer with no recorded
    // order. Nothing in this module is worth that.
    logger.warn(
      { err, draftId: input.draftId },
      "Server-side GA4 purchase could not be dispatched; the capture itself is unaffected",
    );
  }
}

function dispatchPurchase(input: Ga4PurchaseInput): void {
  const creds = credentials();
  // Feature off. Not a warning: unset credentials are the normal state in
  // development and in every environment that has not opted in.
  if (!creds) return;

  // No client id means the visitor never granted analytics consent, so no `_ga`
  // cookie ever existed. Inventing one would create a brand-new GA4 user per
  // order whose entire history is a single purchase — that lands in "Direct"
  // and actively corrupts the channel report we are trying to fix. Silently
  // under-reporting is the lesser error.
  if (!input.gaClientId) return;

  const url = `${MP_ENDPOINT}?measurement_id=${encodeURIComponent(creds.measurementId)}&api_secret=${encodeURIComponent(creds.apiSecret)}`;
  const body = buildPayload(input, input.gaClientId);
  const send = transport ?? defaultTransport;

  void Promise.resolve()
    .then(() => send(url, body))
    .catch((err: unknown) => {
      logger.warn(
        { err, draftId: input.draftId },
        "Server-side GA4 purchase send failed; the capture itself is unaffected",
      );
    });
}
