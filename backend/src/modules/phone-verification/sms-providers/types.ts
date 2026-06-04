export interface SmsSendInput {
  toE164: string;
  message: string;
}

export interface SmsSendResult {
  provider: string;
  providerMessageId: string | null;
}

export interface SmsProvider {
  sendSms(input: SmsSendInput): Promise<SmsSendResult>;
}
