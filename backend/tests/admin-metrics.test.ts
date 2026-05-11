import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  parsePeriodDays,
  formatAudienceStatusLabel,
  serializeAdminAudienceCsv,
} from "../src/modules/admin/admin-metrics.routes.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminMetricsSource = readFileSync(
  path.join(repoRoot, "src/modules/admin/admin-metrics.routes.ts"),
  "utf8",
);

describe("admin metrics", () => {
  it("parsePeriodDays maps period query params to day counts", () => {
    expect(parsePeriodDays("today")).toBe(1);
    expect(parsePeriodDays("7d")).toBe(7);
    expect(parsePeriodDays("30d")).toBe(30);
    expect(parsePeriodDays("garbage")).toBe(7); // default
    expect(parsePeriodDays(undefined)).toBe(7); // default
  });

  it("labels submitted drafts as sent / being dispatched for the audience list", () => {
    expect(formatAudienceStatusLabel("submitted")).toBe("Sent / being dispatched");
    expect(formatAudienceStatusLabel("dispatched")).toBe("Dispatched");
    expect(formatAudienceStatusLabel("closed")).toBe("Closed");
  });

  it("serializes CSV rows with a header and escaped cells", () => {
    expect(
      serializeAdminAudienceCsv([
        {
          email: 'ops,"team"@example.ch',
          locale: "en-CH",
          furthestStatus: "Sent / being dispatched",
          sessionId: "session-1",
          draftId: "draft-1",
          firstSeenAt: "2026-05-01T00:00:00.000Z",
          lastSeenAt: "2026-05-01T12:00:00.000Z",
        },
      ]),
    ).toBe(
      [
        "email,locale,furthestStatus,sessionId,draftId,firstSeenAt,lastSeenAt",
        '"ops,""team""@example.ch",en-CH,Sent / being dispatched,session-1,draft-1,2026-05-01T00:00:00.000Z,2026-05-01T12:00:00.000Z',
      ].join("\n"),
    );
  });

  it("registers dedicated JSON and CSV audience routes", () => {
    expect(adminMetricsSource).toContain("/admin/audience/sent-or-dispatching");
    expect(adminMetricsSource).toContain("text/csv; charset=utf-8");
    expect(adminMetricsSource).toContain("Content-Disposition");
  });
});
