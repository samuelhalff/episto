import { afterEach, describe, expect, it, vi } from "vitest";

import { BudgetSmsProvider } from "../src/modules/phone-verification/sms-providers/budgetsms.provider.js";

describe("BudgetSmsProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends BudgetSMS requests with server-side credentials and normalized destination", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("123456789", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new BudgetSmsProvider({
      username: "user",
      userId: "123",
      handle: "handle",
      senderId: "EPISTO",
      apiBaseUrl: "https://api.budgetsms.net/sendsms/",
      timeoutMs: 5000,
    });

    const result = await provider.sendSms({
      toE164: "+41791234567",
      message: "Episto code: 123456. Expires in 10 minutes.",
    });

    expect(result.providerMessageId).toBe("123456789");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe("https://api.budgetsms.net/sendsms/");
    expect(url.searchParams.get("username")).toBe("user");
    expect(url.searchParams.get("userid")).toBe("123");
    expect(url.searchParams.get("handle")).toBe("handle");
    expect(url.searchParams.get("from")).toBe("EPISTO");
    expect(url.searchParams.get("to")).toBe("41791234567");
    expect(url.searchParams.get("msg")).toBe(
      "Episto code: 123456. Expires in 10 minutes.",
    );
  });

  it("turns BudgetSMS error codes into provider errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("30", { status: 200 })),
    );

    const provider = new BudgetSmsProvider({
      username: "user",
      userId: "123",
      handle: "handle",
      senderId: "EPISTO",
      apiBaseUrl: "https://api.budgetsms.net/sendsms/",
      timeoutMs: 5000,
    });

    await expect(
      provider.sendSms({
        toE164: "+41791234567",
        message: "Episto code: 123456. Expires in 10 minutes.",
      }),
    ).rejects.toThrow("BudgetSMS failed with code 30");
  });
});
