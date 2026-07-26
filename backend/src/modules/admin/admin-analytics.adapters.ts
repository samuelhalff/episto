import { google } from "googleapis";
import type { Env } from "../../shared/config/index.js";
import type { AdminAnalyticsSnapshot } from "@episto/shared";

export interface AnalyticsSourceRows {
  ga4?: Omit<Extract<AdminAnalyticsSnapshot["ga4"], { status: "connected" }>, "status">;
  searchConsole?: Omit<
    Extract<AdminAnalyticsSnapshot["searchConsole"], { status: "connected" }>,
    "status"
  >;
  ads?: Omit<Extract<AdminAnalyticsSnapshot["ads"], { status: "connected" }>, "status">;
}

export function buildAnalyticsSnapshot(
  rows: AnalyticsSourceRows,
): AdminAnalyticsSnapshot {
  return {
    ga4: rows.ga4
      ? { status: "connected", ...rows.ga4 }
      : { status: "unavailable", reason: "not_configured" },
    searchConsole: rows.searchConsole
      ? { status: "connected", ...rows.searchConsole }
      : { status: "unavailable", reason: "not_configured" },
    ads: rows.ads
      ? { status: "connected", ...rows.ads }
      : { status: "unavailable", reason: "not_configured" },
  };
}

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

function configured(config: Env): boolean {
  return Boolean(config.GOOGLE_SERVICE_ACCOUNT_FILE);
}

function numberValue(value: string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateRange(days: number): AnalyticsDateRange {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(days - 1, 0));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function authFor(config: Env) {
  if (!config.GOOGLE_SERVICE_ACCOUNT_FILE) return null;
  return new google.auth.GoogleAuth({
    keyFile: config.GOOGLE_SERVICE_ACCOUNT_FILE,
    scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/adwords",
    ],
  });
}

function eventCount(
  rows: Array<{
    dimensionValues: Array<{ value: string | null }> | undefined;
    metricValues: Array<{ value: string | null }> | undefined;
  }>,
  name: string,
): number {
  const row = rows.find((item) => item.dimensionValues?.[0]?.value === name);
  return numberValue(row?.metricValues?.[0]?.value);
}

async function readGa4(
  config: Env,
  range: AnalyticsDateRange,
): Promise<AnalyticsSourceRows["ga4"]> {
  if (!config.GA4_PROPERTY_ID) return undefined;
  const auth = authFor(config);
  if (!auth) return undefined;
  const analytics = google.analyticsdata({ version: "v1beta", auth });
  const base = {
    property: `properties/${config.GA4_PROPERTY_ID}`,
    requestBody: {
      dateRanges: [range],
    },
  };
  const [overview, events] = await Promise.all([
    analytics.properties.runReport({
      ...base,
      requestBody: {
        ...base.requestBody,
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
        ],
      },
    }),
    analytics.properties.runReport({
      ...base,
      requestBody: {
        ...base.requestBody,
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
      },
    }),
  ]);
  const metrics = overview.data.rows?.[0]?.metricValues ?? [];
  const eventRows = (events.data.rows ?? []).map((row) => ({
    dimensionValues: row.dimensionValues?.map((value) => ({
      value: value.value ?? null,
    })),
    metricValues: row.metricValues?.map((value) => ({ value: value.value ?? null })),
  }));
  return {
    sessions: numberValue(metrics[0]?.value),
    activeUsers: numberValue(metrics[1]?.value),
    pageViews: numberValue(metrics[2]?.value),
    conversations: eventCount(eventRows, "agent_first_message"),
    draftStarts: eventCount(eventRows, "draft_entry_started"),
    checkoutsStarted: eventCount(eventRows, "checkout_started"),
    purchases: eventCount(eventRows, "purchase"),
  };
}

async function readSearchConsole(
  config: Env,
  range: AnalyticsDateRange,
): Promise<AnalyticsSourceRows["searchConsole"]> {
  if (!config.GSC_SITE_URL) return undefined;
  const auth = authFor(config);
  if (!auth) return undefined;
  const searchConsole = google.searchconsole({ version: "v1", auth });
  const response = await searchConsole.searchanalytics.query({
    siteUrl: config.GSC_SITE_URL,
    requestBody: {
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: [],
      rowLimit: 1,
    },
  });
  const row = response.data.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
  };
}

async function readAds(
  config: Env,
  range: AnalyticsDateRange,
): Promise<AnalyticsSourceRows["ads"]> {
  if (!config.GOOGLE_ADS_CUSTOMER_ID || !config.GOOGLE_ADS_DEVELOPER_TOKEN) {
    return undefined;
  }
  const auth = authFor(config);
  if (!auth) return undefined;
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const query = `SELECT campaign.id, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${range.startDate}' AND '${range.endDate}' AND campaign.status != 'REMOVED'`;
  const response = await fetch(
    `https://googleads.googleapis.com/v21/customers/${config.GOOGLE_ADS_CUSTOMER_ID}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "developer-token": config.GOOGLE_ADS_DEVELOPER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  if (!response.ok) throw new Error(`Google Ads request failed: ${response.status}`);
  const batches = (await response.json()) as Array<{
    results?: Array<{
      campaign?: { id?: string };
      metrics?: {
        costMicros?: string;
        clicks?: string;
        impressions?: string;
        conversions?: number;
      };
    }>;
  }>;
  const rows = batches.flatMap((batch) => batch.results ?? []);
  return {
    spendCents: Math.round(
      rows.reduce((sum, row) => sum + numberValue(row.metrics?.costMicros), 0) / 10_000,
    ),
    clicks: rows.reduce((sum, row) => sum + numberValue(row.metrics?.clicks), 0),
    impressions: rows.reduce(
      (sum, row) => sum + numberValue(row.metrics?.impressions),
      0,
    ),
    conversions: rows.reduce((sum, row) => sum + (row.metrics?.conversions ?? 0), 0),
    campaignCount: new Set(rows.map((row) => row.campaign?.id).filter(Boolean)).size,
  };
}

/**
 * Bound each external analytics call so a stalled Google endpoint can never hang
 * the admin dashboard request. On timeout the promise rejects and allSettled
 * surfaces `request_failed` — the internal DB dashboard is unaffected.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_resolve, reject) => {
      const t = setTimeout(() => reject(new Error("analytics_timeout")), ms);
      if (typeof t.unref === "function") t.unref();
    }),
  ]);
}

const EXTERNAL_ANALYTICS_TIMEOUT_MS = 5_000;

export async function loadExternalAnalytics(
  config: Env,
  days: number,
): Promise<AdminAnalyticsSnapshot> {
  if (!configured(config)) return buildAnalyticsSnapshot({});
  const range = dateRange(days);
  const [ga4, searchConsole, ads] = await Promise.allSettled([
    withTimeout(readGa4(config, range), EXTERNAL_ANALYTICS_TIMEOUT_MS),
    withTimeout(readSearchConsole(config, range), EXTERNAL_ANALYTICS_TIMEOUT_MS),
    withTimeout(readAds(config, range), EXTERNAL_ANALYTICS_TIMEOUT_MS),
  ]);
  const sourceRows: AnalyticsSourceRows = {};
  if (ga4.status === "fulfilled" && ga4.value) sourceRows.ga4 = ga4.value;
  if (searchConsole.status === "fulfilled" && searchConsole.value) {
    sourceRows.searchConsole = searchConsole.value;
  }
  if (ads.status === "fulfilled" && ads.value) sourceRows.ads = ads.value;
  const snapshot = buildAnalyticsSnapshot(sourceRows);
  return {
    ga4:
      ga4.status === "rejected"
        ? { status: "unavailable", reason: "request_failed" }
        : snapshot.ga4,
    searchConsole:
      searchConsole.status === "rejected"
        ? { status: "unavailable", reason: "request_failed" }
        : snapshot.searchConsole,
    ads:
      ads.status === "rejected"
        ? { status: "unavailable", reason: "request_failed" }
        : snapshot.ads,
  };
}
