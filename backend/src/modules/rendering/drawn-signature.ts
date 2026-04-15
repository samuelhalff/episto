import { createHash } from "node:crypto";
import { LETTER_COLORS } from "@swiss-mail/shared";

export interface DrawnSignatureAsset {
  mimeType: "image/png" | "image/jpeg";
  base64: string;
}

export function buildBlueSignatureSvgMarkup(asset: DrawnSignatureAsset): string {
  const maskId = `signature-mask-${createHash("sha1")
    .update(`${asset.mimeType}:${asset.base64}`)
    .digest("hex")
    .slice(0, 12)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" preserveAspectRatio="xMinYMid meet">
  <defs>
    <mask id="${maskId}">
      <image href="data:${asset.mimeType};base64,${asset.base64}" width="100%" height="100%" preserveAspectRatio="xMinYMid meet" />
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="${LETTER_COLORS.signatureDrawnInk}" mask="url(#${maskId})" />
</svg>`;
}

export function buildBlueSignatureSvgResponse(asset: DrawnSignatureAsset): Buffer {
  return Buffer.from(buildBlueSignatureSvgMarkup(asset), "utf8");
}
