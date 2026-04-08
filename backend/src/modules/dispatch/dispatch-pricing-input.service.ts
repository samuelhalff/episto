import { createHash } from "node:crypto";
import { env } from "../../shared/config/index.js";
import { assertDispatchPolicyConstraints } from "./dispatch-policy.js";

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
  recipientCountry?: string | null;
}): DispatchPricingInput {
  assertDispatchPolicyConstraints({
    recipientCountry: args.recipientCountry,
    estimatedPages: args.estimatedPages,
  });

  return {
    deliveryType: args.deliveryType,
    postage:
      args.deliveryType === "registered"
        ? env().EPOST_REGISTERED_POSTAGE
        : env().EPOST_STANDARD_POSTAGE,
    numberOfPage: Math.max(1, args.estimatedPages),
    attachmentMode: args.attachmentCount > 0 ? "single_hint" : "none",
    shippingCountry: "CH",
    envelopeSize: "C5",
    windowLocation: "LEFT",
    duplex: false,
  };
}

export function hashDispatchPricingInput(input: DispatchPricingInput): string {
  // Explicit alphabetical key ordering guarantees a stable hash regardless of
  // how the object was constructed.
  const stable = {
    attachmentMode: input.attachmentMode,
    deliveryType: input.deliveryType,
    duplex: input.duplex,
    envelopeSize: input.envelopeSize,
    numberOfPage: input.numberOfPage,
    postage: input.postage,
    shippingCountry: input.shippingCountry,
    windowLocation: input.windowLocation,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
