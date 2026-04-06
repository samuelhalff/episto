import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const statusBadgePath = path.join(
  repoRoot,
  "frontend/src/components/ui/status-badge.tsx",
);
const deliveryTypeBadgePath = path.join(
  repoRoot,
  "frontend/src/components/product/DeliveryTypeBadge.tsx",
);

describe("shared badge components", () => {
  it("defines reusable status and delivery badges", () => {
    expect(existsSync(statusBadgePath)).toBe(true);
    expect(existsSync(deliveryTypeBadgePath)).toBe(true);

    const statusBadgeSource = existsSync(statusBadgePath)
      ? readFileSync(statusBadgePath, "utf8")
      : "";
    const deliveryTypeBadgeSource = existsSync(deliveryTypeBadgePath)
      ? readFileSync(deliveryTypeBadgePath, "utf8")
      : "";

    expect(statusBadgeSource).toContain("type StatusBadgeTone");
    expect(statusBadgeSource).toContain("tone");
    expect(deliveryTypeBadgeSource).toContain("deliveryType");
    expect(deliveryTypeBadgeSource).toContain("StatusBadge");
  });
});
