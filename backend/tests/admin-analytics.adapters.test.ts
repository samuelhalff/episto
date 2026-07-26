import { describe, expect, it } from "vitest";

import {
  buildAnalyticsSnapshot,
  type AnalyticsSourceRows,
} from "../src/modules/admin/admin-analytics.adapters.js";

describe("admin analytics adapters", () => {
  it("normalizes GA4, Search Console, and Ads rows into source-separated metrics", () => {
    const rows: AnalyticsSourceRows = {
      ga4: {
        sessions: 42,
        activeUsers: 31,
        pageViews: 88,
        conversations: 20,
        draftStarts: 12,
        checkoutsStarted: 7,
        purchases: 3,
      },
      searchConsole: {
        clicks: 9,
        impressions: 240,
        ctr: 0.0375,
        position: 11.4,
      },
      ads: {
        spendCents: 1250,
        clicks: 20,
        impressions: 600,
        conversions: 2,
        campaignCount: 1,
      },
    };

    expect(buildAnalyticsSnapshot(rows)).toEqual({
      ga4: {
        status: "connected",
        sessions: 42,
        activeUsers: 31,
        pageViews: 88,
        conversations: 20,
        draftStarts: 12,
        checkoutsStarted: 7,
        purchases: 3,
      },
      searchConsole: {
        status: "connected",
        clicks: 9,
        impressions: 240,
        ctr: 0.0375,
        position: 11.4,
      },
      ads: {
        status: "connected",
        spendCents: 1250,
        clicks: 20,
        impressions: 600,
        conversions: 2,
        campaignCount: 1,
      },
    });
  });

  it("returns unavailable source states without inventing zero data", () => {
    expect(buildAnalyticsSnapshot({})).toEqual({
      ga4: { status: "unavailable", reason: "not_configured" },
      searchConsole: { status: "unavailable", reason: "not_configured" },
      ads: { status: "unavailable", reason: "not_configured" },
    });
  });
});
