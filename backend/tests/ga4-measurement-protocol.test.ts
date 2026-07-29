import { buildOrderReference } from "@episto/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  sendGa4Purchase,
  setGa4Transport,
  shouldSendGa4Purchase,
} from "../src/modules/analytics/ga4-measurement-protocol.js";

const mocks = vi.hoisted(() => ({
  // LOG_LEVEL is present because the module builds a pino logger at import
  // time; pino refuses an undefined level.
  base: { LOG_LEVEL: "silent", NODE_ENV: "test" } as Record<string, string | undefined>,
  envValues: { LOG_LEVEL: "silent", NODE_ENV: "test" } as Record<
    string,
    string | undefined
  >,
  envLoaded: true,
}));

vi.mock("../src/shared/config/index.js", () => ({
  env: () => mocks.envValues,
  isEnvLoaded: () => mocks.envLoaded,
}));

interface SentRequest {
  url: string;
  body: unknown;
}

/** Lets the fire-and-forget promise chain settle before assertions run. */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("GA4 measurement protocol purchase", () => {
  let sent: SentRequest[];

  beforeEach(() => {
    sent = [];
    mocks.envLoaded = true;
    mocks.envValues = {
      ...mocks.base,
      GA4_MEASUREMENT_ID: "G-TEST123",
      GA4_API_SECRET: "secret-value",
    };
    setGa4Transport(async (url, body) => {
      sent.push({ url, body: JSON.parse(body) as unknown });
    });
  });

  afterEach(() => {
    setGa4Transport(null);
  });

  it("sends the same transaction_id the confirmation page sends", async () => {
    sendGa4Purchase({
      draftId: "abcdef01-2345-6789-abcd-ef0123456789",
      gaClientId: "1234567890.1699999999",
      valueCents: 625,
      currency: "CHF",
    });
    await flushMicrotasks();

    expect(sent).toHaveLength(1);
    const payload = sent[0]?.body as {
      client_id: string;
      events: { name: string; params: Record<string, unknown> }[];
    };
    expect(payload.client_id).toBe("1234567890.1699999999");
    expect(payload.events[0]?.name).toBe("purchase");
    // The client fires `purchase` with buildOrderReference(draftId) as the
    // transaction_id. If these ever diverge GA4 stops de-duplicating and counts
    // the same order twice, so this is asserted against the shared builder
    // rather than a hardcoded string.
    expect(payload.events[0]?.params.transaction_id).toBe(
      buildOrderReference("abcdef01-2345-6789-abcd-ef0123456789"),
    );
    expect(payload.events[0]?.params.value).toBe(6.25);
    expect(payload.events[0]?.params.currency).toBe("CHF");
  });

  it("puts the measurement id and api secret on the query string", async () => {
    sendGa4Purchase({
      draftId: "draft-1",
      gaClientId: "1.2",
      valueCents: 100,
      currency: "CHF",
    });
    await flushMicrotasks();

    expect(sent[0]?.url).toContain("measurement_id=G-TEST123");
    expect(sent[0]?.url).toContain("api_secret=secret-value");
  });

  it("skips the send when there is no client id", async () => {
    expect(shouldSendGa4Purchase(null)).toBe(false);
    sendGa4Purchase({
      draftId: "draft-1",
      gaClientId: null,
      valueCents: 625,
      currency: "CHF",
    });
    await flushMicrotasks();

    expect(sent).toHaveLength(0);
  });

  it("skips the send when the GA4 env vars are unset", async () => {
    mocks.envValues = { ...mocks.base };
    expect(shouldSendGa4Purchase("1.2")).toBe(false);
    sendGa4Purchase({
      draftId: "draft-1",
      gaClientId: "1.2",
      valueCents: 625,
      currency: "CHF",
    });
    await flushMicrotasks();

    expect(sent).toHaveLength(0);
  });

  it("skips the send when only one of the two credentials is present", async () => {
    mocks.envValues = { ...mocks.base, GA4_MEASUREMENT_ID: "G-TEST123" };
    sendGa4Purchase({
      draftId: "draft-1",
      gaClientId: "1.2",
      valueCents: 625,
      currency: "CHF",
    });
    await flushMicrotasks();

    expect(sent).toHaveLength(0);
  });

  it("sends a zero-value purchase for a free order", async () => {
    sendGa4Purchase({
      draftId: "draft-1",
      gaClientId: "1.2",
      valueCents: 0,
      currency: "CHF",
    });
    await flushMicrotasks();

    const payload = sent[0]?.body as { events: { params: { value: number } }[] };
    expect(payload.events[0]?.params.value).toBe(0);
  });

  it("swallows a transport failure instead of throwing into the capture path", async () => {
    setGa4Transport(() => Promise.reject(new Error("GA4 is down")));

    expect(() => {
      sendGa4Purchase({
        draftId: "draft-1",
        gaClientId: "1.2",
        valueCents: 625,
        currency: "CHF",
      });
    }).not.toThrow();
    await flushMicrotasks();
  });

  it("does not throw when the transport throws synchronously", async () => {
    setGa4Transport(() => {
      throw new Error("boom");
    });

    expect(() => {
      sendGa4Purchase({
        draftId: "draft-1",
        gaClientId: "1.2",
        valueCents: 625,
        currency: "CHF",
      });
    }).not.toThrow();
    await flushMicrotasks();
  });

  it("does not send when the environment has never been loaded", async () => {
    mocks.envLoaded = false;
    sendGa4Purchase({
      draftId: "draft-1",
      gaClientId: "1.2",
      valueCents: 625,
      currency: "CHF",
    });
    await flushMicrotasks();

    expect(sent).toHaveLength(0);
  });
});
