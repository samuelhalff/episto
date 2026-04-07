import { createHash } from "node:crypto";
import { env } from "../../shared/config/index.js";

export interface DispatchPricingInput {
  deliveryType: "standard" | "registered";
  postage: string;
  numberOfPage: number;
  attachmentMode: "none" | "single_hint";
  shippingCountry: "CH";
  envelopeSize: "C5";
  windowLocation: "LEFT";
  duplex: false;
}

export function buildDispatchPricingInput(args: {
  draftId: string;
  snapshotId: string | null;
  deliveryType: "standard" | "registered";
  estimatedPages: number;
  attachmentCount: number;
  country: string;
}): DispatchPricingInput {
  return {
    deliveryType: args.deliveryType,
    postage:
      args.deliveryType === "registered"
        ? env().EPOST_REGISTERED_POSTAGE
        : env().EPOST_STANDARD_POSTAGE,
    numberOfPage: Math.max(1, Math.min(5, args.estimatedPages)),
    attachmentMode: args.attachmentCount > 0 ? "single_hint" : "none",
    shippingCountry: "CH",
    envelopeSize: "C5",
    windowLocation: "LEFT",
    duplex: false,
  };
}

export function hashDispatchPricingInput(input: DispatchPricingInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
