import { env } from "../../../shared/config/index.js";
import { BudgetSmsProvider } from "./budgetsms.provider.js";
import { NoopSmsProvider } from "./noop.provider.js";
import type { SmsProvider } from "./types.js";

export function createSmsProvider(): SmsProvider {
  const config = env();

  if (config.SMS_PROVIDER === "budgetsms") {
    return new BudgetSmsProvider({
      username: config.BUDGETSMS_USERNAME ?? "",
      userId: config.BUDGETSMS_USER_ID ?? "",
      handle: config.BUDGETSMS_HANDLE ?? "",
      senderId: config.SMS_SENDER_ID,
      apiBaseUrl: config.BUDGETSMS_API_BASE_URL,
      timeoutMs: config.SMS_REQUEST_TIMEOUT_MS,
    });
  }

  return new NoopSmsProvider();
}
