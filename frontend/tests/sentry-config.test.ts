import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import { createSentryInitOptions } from "../src/lib/sentry-config";

describe("frontend sentry config", () => {
  it("redacts token-bearing urls and paths before sending events", () => {
    const beforeSend = createSentryInitOptions(
      "https://public@example.ingest.sentry.io/123",
    ).beforeSend;
    const event: ErrorEvent = {
      request: {
        url: "https://swissmail.ch/resume/secret-token?next=/status/order-token",
      },
      tags: {
        route: "/status/order-token",
      },
      contexts: {
        safe_metadata: {
          path: "/v1/orders/order-token/pdf",
          origin: "checkout",
        },
      },
      transaction: "/resume/secret-token",
    };

    const sanitized = beforeSend(event);

    expect(sanitized.request?.url).toBe(
      "https://swissmail.ch/resume/[token]?next=%2Fstatus%2F%5Btoken%5D",
    );
    expect(sanitized.tags?.route).toBe("/status/[token]");
    expect(sanitized.contexts?.safe_metadata).toEqual({
      path: "/v1/orders/[token]/pdf",
      origin: "checkout",
    });
    expect(sanitized.transaction).toBe("/resume/[token]");
  });
});
