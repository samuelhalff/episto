/**
 * The pieces every email renderer needs.
 *
 * They lived in `email-templates.ts` until a second file needed them. Nothing
 * here is email-specific beyond `layoutConfig` — the readers exist because the
 * job payload is `Record<string, unknown>` off a queue, so every field is
 * untrusted until it has been narrowed.
 */

import { BRAND_NAME } from "../shared/brand.js";

import type { EmailLayoutConfig } from "./email-layout.js";
import { resolveLocale } from "./email-strings.js";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type DeliveryType = "standard" | "registered";

export function readString(
  data: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

export function readInteger(
  data: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
}

export function layoutConfig(
  locale: string,
  data: Record<string, unknown>,
): EmailLayoutConfig {
  return {
    brandName: readString(data, "brandName", BRAND_NAME),
    locale: resolveLocale(locale),
    appPublicUrl: readString(data, "appPublicUrl"),
    legalEntityName: readString(data, "legalEntityName"),
    legalEntityAddress: readString(data, "legalEntityAddress"),
    legalEntityCountry: readString(data, "legalEntityCountry"),
    legalEntityUidVat: readString(data, "legalEntityUidVat"),
    supportEmail: readString(data, "supportEmail"),
  };
}

export function replaceRetentionDays(template: string, days: number): string {
  return template.replace("{days}", String(days));
}

export function readDeliveryType(data: Record<string, unknown>): DeliveryType | null {
  const value = data.deliveryType;
  return value === "standard" || value === "registered" ? value : null;
}

export function formatDeliveryTypeLabel(
  locale: string,
  deliveryType: DeliveryType | null,
): string {
  if (!deliveryType) {
    return "";
  }

  switch (resolveLocale(locale)) {
    case "de-CH":
      return deliveryType === "registered" ? "Einschreiben" : "A-Post";
    case "fr-CH":
      return deliveryType === "registered" ? "Courrier recommandé" : "Courrier standard";
    case "it-CH":
      return deliveryType === "registered" ? "Raccomandata" : "Posta standard";
    case "en-CH":
    default:
      return deliveryType === "registered" ? "Registered mail" : "Standard mail";
  }
}
