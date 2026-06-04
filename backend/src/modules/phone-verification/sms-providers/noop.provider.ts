import type { SmsProvider, SmsSendInput, SmsSendResult } from "./types.js";

export class NoopSmsProvider implements SmsProvider {
  async sendSms(_input: SmsSendInput): Promise<SmsSendResult> {
    return {
      provider: "noop",
      providerMessageId: null,
    };
  }
}
