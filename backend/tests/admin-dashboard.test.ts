import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  parseDashboardPeriod,
  periodDays,
  buildMetric,
  dispatchSuccessRate,
  sumContributionCents,
  hardenCsvCell,
  serializeHardenedCsv,
  parsePositiveInt,
  pickEnum,
  LOW_VOLUME_THRESHOLD,
} from "../src/modules/admin/admin-dashboard.service.js";
import { computeOrderContributionCents } from "../src/modules/payments/order-economics.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(
  path.join(repoRoot, "src/modules/admin/admin-dashboard.service.ts"),
  "utf8",
);
const routesSource = readFileSync(
  path.join(repoRoot, "src/modules/admin/admin-dashboard.routes.ts"),
  "utf8",
);

describe("admin dashboard — period semantics", () => {
  it("normalizes the period query param", () => {
    expect(parseDashboardPeriod("today")).toBe("today");
    expect(parseDashboardPeriod("7d")).toBe("7d");
    expect(parseDashboardPeriod("30d")).toBe("30d");
    expect(parseDashboardPeriod("garbage")).toBe("7d");
    expect(parseDashboardPeriod(undefined)).toBe("7d");
  });

  it("maps periods to trailing day windows", () => {
    expect(periodDays("today")).toBe(1);
    expect(periodDays("7d")).toBe(7);
    expect(periodDays("30d")).toBe(30);
  });
});

describe("admin dashboard — comparison metrics", () => {
  it("computes a percentage delta vs the previous period", () => {
    const m = buildMetric(120, 100, false);
    expect(m.value).toBe(120);
    expect(m.previousValue).toBe(100);
    expect(m.deltaPercent).toBe(20);
    expect(m.lowVolume).toBe(false);
  });

  it("suppresses the delta on low volume", () => {
    const m = buildMetric(3, 1, true);
    expect(m.deltaPercent).toBeNull();
    expect(m.lowVolume).toBe(true);
  });

  it("suppresses the delta when the previous base is zero", () => {
    expect(buildMetric(5, 0, false).deltaPercent).toBeNull();
  });
});

describe("admin dashboard — dispatch success rate", () => {
  it("rates accepted+reconciled over non-queued attempts", () => {
    expect(
      dispatchSuccessRate({
        accepted: 8,
        reconciled: 1,
        rejected: 1,
        unknown: 0,
        submitted: 0,
      }),
    ).toBe(90);
  });

  it("returns null when nothing has left the queue", () => {
    expect(
      dispatchSuccessRate({
        accepted: 0,
        reconciled: 0,
        rejected: 0,
        unknown: 0,
        submitted: 0,
      }),
    ).toBeNull();
  });
});

describe("admin dashboard — CM1 contribution", () => {
  it("sums per-order CM1 from frozen breakdown values and flags estimated", () => {
    const rows = [
      { total_cents: 455, provider_quoted_cents: 165 },
      { total_cents: 915, provider_quoted_cents: 625 },
    ];
    const expected =
      computeOrderContributionCents({ totalCents: 455, providerQuotedCents: 165 })
        .contributionCents +
      computeOrderContributionCents({ totalCents: 915, providerQuotedCents: 625 })
        .contributionCents;
    const result = sumContributionCents(rows);
    expect(result.contributionCents).toBe(expected);
    // No actual Stripe fee is persisted yet, so every order is estimated.
    expect(result.estimated).toBe(true);
  });

  it("returns zero and not-estimated for an empty period", () => {
    expect(sumContributionCents([])).toEqual({
      contributionCents: 0,
      estimated: false,
    });
  });
});

describe("admin dashboard — CSV hardening", () => {
  it("prefixes a quote on formula-trigger cells", () => {
    expect(hardenCsvCell("=1+1")).toBe("'=1+1");
    expect(hardenCsvCell("+SUM(A1)")).toBe("'+SUM(A1)");
    expect(hardenCsvCell("-2")).toBe("'-2");
    expect(hardenCsvCell("@cmd")).toBe("'@cmd");
    expect(hardenCsvCell("normal")).toBe("normal");
  });

  it("escapes quotes/commas/newlines after neutralizing formulas", () => {
    expect(hardenCsvCell('=a,"b"')).toBe(`"'=a,""b"""`);
  });

  it("serializes with a header row and hardened cells", () => {
    const csv = serializeHardenedCsv([{ ref: "=EVIL", amountCents: 455 }], [
      "ref",
      "amountCents",
    ] as const);
    expect(csv).toBe(["ref,amountCents", "'=EVIL,455"].join("\n"));
  });
});

describe("admin dashboard — input parsing", () => {
  it("clamps pagination to a sane range", () => {
    expect(parsePositiveInt("3", 1, 100)).toBe(3);
    expect(parsePositiveInt("0", 1, 100)).toBe(1);
    expect(parsePositiveInt("abc", 1, 100)).toBe(1);
    expect(parsePositiveInt("9999", 1, 100)).toBe(100);
  });

  it("only accepts whitelisted enum filter values", () => {
    expect(pickEnum("captured", ["captured", "failed"] as const)).toBe("captured");
    expect(pickEnum("nonsense", ["captured", "failed"] as const)).toBeUndefined();
    expect(pickEnum(undefined, ["captured"] as const)).toBeUndefined();
  });
});

describe("admin dashboard — contract guards", () => {
  it("keeps current-state alerts out of the period filter", () => {
    expect(source).toContain("Current-state alerts");
    expect(source).toContain("state = 'refund_pending'");
    expect(source).toContain("state IN ('rejected', 'unknown')");
  });

  it("sets no-store on the PII-adjacent endpoints", () => {
    expect(routesSource).toContain('reply.header("Cache-Control", "no-store")');
  });

  it("masks letter identifiers with order ref / short draft id (no PII)", () => {
    expect(source).toContain("'draft-' || LEFT(p.draft_id::text, 8)");
    expect(source).not.toContain("s.email");
  });

  it("declares a low-volume threshold", () => {
    expect(LOW_VOLUME_THRESHOLD).toBeGreaterThan(0);
  });
});
