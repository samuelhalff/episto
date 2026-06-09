import { env } from "../../shared/config/index.js";

const PRODUCTION_SENDER_DOMAIN = "episto.ch";

export interface EmailReadinessStatus {
  ok: boolean;
  detail?: string;
  senderAddress: string;
  supportAddress: string;
  senderDomain: string | null;
}

function extractDomain(address: string): string | null {
  const normalizedAddress = address.trim().toLowerCase();
  const bracketMatch = normalizedAddress.match(/<([^<>\s@]+@[^<>\s@]+)>$/);
  const emailAddress = bracketMatch?.[1] ?? normalizedAddress;
  const [, domain] = emailAddress.split("@");
  return domain?.trim() || null;
}

export function checkEmailReadiness(): EmailReadinessStatus {
  const config = env();
  const senderDomain = extractDomain(config.EMAIL_FROM);

  if (config.NODE_ENV !== "production" && senderDomain === PRODUCTION_SENDER_DOMAIN) {
    return {
      ok: false,
      detail:
        "Non-production email still uses episto.ch. Configure a verified development sender domain until the production domain is verified in Resend.",
      senderAddress: config.EMAIL_FROM,
      supportAddress: config.SUPPORT_EMAIL,
      senderDomain,
    };
  }

  return {
    ok: true,
    senderAddress: config.EMAIL_FROM,
    supportAddress: config.SUPPORT_EMAIL,
    senderDomain,
  };
}
