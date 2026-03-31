import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getRetryDelayMs,
  isRetryableProviderError,
  withProviderRetries,
} from "../src/modules/ai/adapters/provider-retry.js";

describe("provider retry helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats provider 429 errors as retryable", () => {
    expect(
      isRetryableProviderError(Object.assign(new Error("Too many requests"), { status: 429 })),
    ).toBe(true);
  });

  it("does not retry access-denied errors", () => {
    expect(
      isRetryableProviderError(Object.assign(new Error("Forbidden"), { status: 403 })),
    ).toBe(false);
  });

  it("uses provider retry-after hints when available", () => {
    expect(
      getRetryDelayMs(
        Object.assign(new Error("Rate limit"), {
          headers: { "retry-after": "2" },
        }),
        1,
      ),
    ).toBe(2000);
  });

  it("retries transient provider failures before succeeding", async () => {
    vi.useFakeTimers();

    const transientError = Object.assign(new Error("Rate limit exceeded"), { status: 429 });
    const run = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValue("ok");
    const warn = vi.fn();

    const promise = withProviderRetries({
      provider: "Azure AI Project agent",
      operation: "classify",
      logger: { warn },
      mapError: (error) => (error instanceof Error ? error : new Error(String(error))),
      run,
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("stops immediately on non-retryable provider failures", async () => {
    const accessDenied = Object.assign(new Error("Forbidden"), { status: 403 });
    const run = vi.fn<() => Promise<string>>().mockRejectedValue(accessDenied);
    const warn = vi.fn();

    await expect(
      withProviderRetries({
        provider: "Azure AI Project agent",
        operation: "classify",
        logger: { warn },
        mapError: (error) => (error instanceof Error ? error : new Error(String(error))),
        run,
      }),
    ).rejects.toThrow("Forbidden");

    expect(run).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });
});
