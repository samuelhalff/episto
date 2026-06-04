import type { SmsProvider, SmsSendInput, SmsSendResult } from "./types.js";

interface BudgetSmsProviderOptions {
  username: string;
  userId: string;
  handle: string;
  senderId: string;
  apiBaseUrl: string;
  timeoutMs: number;
}

// BudgetSMS signals application errors via HTTP 200 with a 1–3 digit numeric body
// (e.g. "30" = invalid destination, "31" = sender too long). Successful sends always
// return a long numeric message ID. This pattern deliberately matches only short bodies.
const BUDGETSMS_ERROR_PATTERN = /^\d{1,3}$/;

export class BudgetSmsProvider implements SmsProvider {
  constructor(private readonly options: BudgetSmsProviderOptions) {}

  async sendSms(input: SmsSendInput): Promise<SmsSendResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const url = new URL(this.options.apiBaseUrl);
      url.searchParams.set("username", this.options.username);
      url.searchParams.set("userid", this.options.userId);
      url.searchParams.set("handle", this.options.handle);
      url.searchParams.set("from", this.options.senderId);
      url.searchParams.set("to", input.toE164.replace(/^\+/, ""));
      url.searchParams.set("msg", input.message);

      const response = await fetch(url, { signal: controller.signal });
      const body = (await response.text()).trim();

      if (!response.ok) {
        throw new Error(`BudgetSMS HTTP ${response.status}: ${body}`);
      }

      if (BUDGETSMS_ERROR_PATTERN.test(body)) {
        throw new Error(`BudgetSMS failed with code ${body}`);
      }

      return {
        provider: "budgetsms",
        providerMessageId: body || null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
