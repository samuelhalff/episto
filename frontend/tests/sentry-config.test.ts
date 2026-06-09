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
        url: "https://episto.ch/resume/secret-token?next=/status/order-token",
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
      "https://episto.ch/resume/[token]?next=%2Fstatus%2F%5Btoken%5D",
    );
    expect(sanitized.tags?.route).toBe("/status/[token]");
    expect(sanitized.contexts?.safe_metadata).toEqual({
      path: "/v1/orders/[token]/pdf",
      origin: "checkout",
    });
    expect(sanitized.transaction).toBe("/resume/[token]");
  });

  it("redacts traced transactions before sending them", () => {
    const options = createSentryInitOptions(
      "https://public@example.ingest.sentry.io/123",
    );
    const beforeSendTransaction = Reflect.get(options, "beforeSendTransaction");
    const transactionEvent = {
      type: "transaction",
      transaction: "/resume/secret-token",
      request: {
        url: "https://episto.ch/status/order-token?next=/resume/secret-token",
      },
      spans: [
        {
          span_id: "0123456789abcdef",
          trace_id: "fedcba9876543210fedcba9876543210",
          start_timestamp: 1,
          timestamp: 2,
          description: "GET /resume/secret-token",
          data: {
            url: "https://episto.ch/status/order-token",
            route: "/status/order-token",
          },
        },
      ],
    };

    expect(beforeSendTransaction).toBeTypeOf("function");
    if (typeof beforeSendTransaction !== "function") {
      throw new Error("beforeSendTransaction should be configured.");
    }

    const sanitized = beforeSendTransaction(transactionEvent);

    expect(sanitized.request?.url).toBe(
      "https://episto.ch/status/[token]?next=%2Fresume%2F%5Btoken%5D",
    );
    expect(sanitized.transaction).toBe("/resume/[token]");
    expect(sanitized.spans).toEqual([
      expect.objectContaining({
        description: "GET /resume/[token]",
        data: {
          url: "https://episto.ch/status/[token]",
          route: "/status/[token]",
        },
      }),
    ]);
  });
});
