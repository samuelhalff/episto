export const BRAND_NAME = "Episto";
export const BRAND_COLOR = "#f6c54a";
export const BRAND_REFERENCE_PREFIX = "EP";
export const BRAND_MARK_VIEW_BOX = "0 0 56 56";
export const BRAND_MARK_BASE = {
  x: 4,
  y: 4,
  width: 48,
  height: 48,
  rx: 18,
} as const;
export const BRAND_MARK_RING = {
  cx: 26,
  cy: 30,
  r: 10.5,
  stroke: "#18181b",
  strokeWidth: 4,
} as const;
export const BRAND_MARK_DOT = {
  cx: 36.5,
  cy: 19.5,
  r: 4.5,
  fill: "#18181b",
} as const;

export function buildOrderReference(sourceId: string): string {
  return `${BRAND_REFERENCE_PREFIX}-${sourceId.slice(0, 8).toUpperCase()}`;
}
