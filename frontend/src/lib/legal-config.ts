import { BRAND_NAME } from "./brand";

export const LEGAL_SERVICE_NAME = BRAND_NAME;
export const LEGAL_REFERENCE_LANGUAGE = "English";
export const LEGAL_WEBSITE_HOST = "episto.ch";

export const LEGAL_OPERATOR = {
  companyName: "West Bay SA",
  addressLines: ["Chemin du Pre-Roset 19", "1294 Genthod", "Switzerland"],
  supportEmail: "contact@episto.ch",
  uidVat: "CHE-107.892.984",
} as const;

export const SWISS_POST_LINKS = {
  gtc: "https://www.swisspost.ch/gtc",
  layout: "https://www.swisspost.ch/layout-of-letters",
  registered: "https://www.post.ch/en/registered",
  privacy: "https://www.post.ch/en/pages/footer/data-protection-and-disclaimer",
} as const;
