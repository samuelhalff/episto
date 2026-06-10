import type { SmsProvider, SmsSendInput, SmsSendResult } from "./types.js";

interface BudgetSmsProviderOptions {
  username: string;
  userId: string;
  handle: string;
  senderId: string;
  apiBaseUrl: string;
  timeoutMs: number;
}

const BUDGETSMS_OK_PATTERN = /^OK\s+(\d+)(?:\s+.*)?$/i;
const BUDGETSMS_ERROR_PATTERN = /^ERR\s+(\d+)$/i;

export class BudgetSmsProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "BudgetSmsProviderError";
  }
}

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

      const errorMatch = body.match(BUDGETSMS_ERROR_PATTERN);
      if (errorMatch) {
        const errorCode = errorMatch[1] ?? "unknown";
        throw new BudgetSmsProviderError(
          `BudgetSMS failed with code ${errorCode}`,
          errorCode,
        );
      }

      const okMatch = body.match(BUDGETSMS_OK_PATTERN);
      if (!okMatch) {
        throw new Error(`BudgetSMS unexpected response: ${body}`);
      }

      return {
        provider: "budgetsms",
        providerMessageId: okMatch[1] ?? null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
