# Analytics & Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive admin dashboard with analytics infrastructure, funnel analysis, session management, operational tooling (timeline, content access, refunds, retention), and privacy notice strip — all Umami-ready for future vendor integration.

**Architecture:** Extend existing Fastify admin module with new metric endpoints that query canonical Drizzle tables directly (no parallel analytics table). Add a thin `product_events` table only for marketing/page-view events. Restructure the frontend admin into a multi-section layout with sidebar navigation, using Next.js sub-routes and a shared auth context. Use the app's existing `--app-*` CSS tokens for consistent dark/light theming.

**Tech Stack:** Fastify, Drizzle ORM, PostgreSQL, React 19, Next.js 16, TanStack Query, Pino, CSS custom properties (no charting library)

**Spec:** `docs/superpowers/specs/analytics-admin-dashboard.md`

---

## File Structure

### New Backend Files
| File | Responsibility |
|------|---------------|
| `backend/src/modules/analytics/composite-sink.ts` | Multi-sink fan-out for analytics events |
| `backend/src/modules/analytics/db-sink.ts` | Writes supplementary events to `product_events` table |
| `backend/src/modules/admin/admin-metrics.routes.ts` | New metric endpoints (active, funnel, summary, errors, locale, AI) |
| `backend/src/modules/admin/admin-sessions.routes.ts` | Sessions list + single-session clear |
| `backend/src/modules/admin/admin-retention.routes.ts` | Retention dashboard data endpoint |

### New Frontend Files
| File | Responsibility |
|------|---------------|
| `frontend/src/app/[locale]/admin/layout.tsx` | Admin shell: sidebar nav + auth context |
| `frontend/src/app/[locale]/admin/admin-auth-context.tsx` | Auth state provider (authHeader, login, logout) |
| `frontend/src/app/[locale]/admin/admin-sidebar.tsx` | Sidebar navigation component |
| `frontend/src/app/[locale]/admin/admin-metric-panels.tsx` | Reusable metric card/panel components |
| `frontend/src/app/[locale]/admin/overview/page.tsx` | Overview dashboard (KPIs, active, errors, payments, dispatch, AI, locale) |
| `frontend/src/app/[locale]/admin/funnel/page.tsx` | Funnel analysis page |
| `frontend/src/app/[locale]/admin/sessions/page.tsx` | Sessions list page |
| `frontend/src/app/[locale]/admin/sessions/[id]/page.tsx` | Session detail + timeline + content access + refund |
| `frontend/src/app/[locale]/admin/retention/page.tsx` | Retention dashboard |
| `frontend/src/app/[locale]/admin/flags/page.tsx` | Flags & review queue |
| `frontend/src/app/[locale]/admin/health/page.tsx` | System health (moved from old overview) |
| `frontend/src/lib/consent.ts` | Consent gate (dormant, Umami-ready) |
| `frontend/src/components/product/PrivacyNoticeStrip.tsx` | Privacy notice banner |

### New Test Files
| File | Tests |
|------|-------|
| `backend/tests/analytics-composite-sink.test.ts` | CompositeSink fan-out, error isolation |
| `backend/tests/admin-metrics.test.ts` | Metric endpoint response shapes |
| `backend/tests/admin-sessions.test.ts` | Session list/clear logic |
| `frontend/tests/admin-auth-context.test.ts` | Auth state management |
| `frontend/tests/privacy-notice-strip.test.ts` | Privacy notice show/dismiss |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/db/schema.ts` | Add `product_events` table |
| `backend/src/modules/analytics/index.ts` | Add new event types, use CompositeSink |
| `backend/src/modules/admin/admin.routes.ts` | Register new sub-route modules |
| `shared/src/query-keys.ts` | Add admin query keys |
| `shared/src/contracts/index.ts` | Add admin response types |
| `frontend/src/app/[locale]/admin/page.tsx` | Convert to login-only or redirect to overview |
| `frontend/src/app/[locale]/admin/admin-api.ts` | Add new fetch helpers and types |

---

## Task 1: Analytics Infrastructure — CompositeSink + DB Sink

**Files:**
- Create: `backend/src/modules/analytics/composite-sink.ts`
- Create: `backend/src/modules/analytics/db-sink.ts`
- Create: `backend/tests/analytics-composite-sink.test.ts`
- Modify: `backend/src/modules/analytics/index.ts`
- Modify: `backend/src/db/schema.ts`

- [ ] **Step 1: Write failing tests for CompositeSink**

```typescript
// backend/tests/analytics-composite-sink.test.ts
import { describe, it, expect, vi } from "vitest";
import { CompositeSink } from "../src/modules/analytics/composite-sink.js";
import type { AnalyticsSink, AnalyticsEvent } from "../src/modules/analytics/index.js";

describe("CompositeSink", () => {
  const event: AnalyticsEvent = {
    event: "session_created",
    sessionId: "s-1",
    locale: "de-CH",
  };

  it("fans out to all sinks", () => {
    const s1 = { record: vi.fn() };
    const s2 = { record: vi.fn() };
    const composite = new CompositeSink([s1, s2]);
    composite.record(event);
    expect(s1.record).toHaveBeenCalledWith(event);
    expect(s2.record).toHaveBeenCalledWith(event);
  });

  it("isolates errors — one sink failure does not block others", () => {
    const s1: AnalyticsSink = { record: () => { throw new Error("boom"); } };
    const s2 = { record: vi.fn() };
    const composite = new CompositeSink([s1, s2]);
    composite.record(event);
    expect(s2.record).toHaveBeenCalledWith(event);
  });

  it("works with zero sinks", () => {
    const composite = new CompositeSink([]);
    expect(() => composite.record(event)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run backend/tests/analytics-composite-sink.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement CompositeSink**

```typescript
// backend/src/modules/analytics/composite-sink.ts
import type { AnalyticsSink, AnalyticsEvent } from "./index.js";
import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("analytics:composite");

export class CompositeSink implements AnalyticsSink {
  constructor(private readonly sinks: AnalyticsSink[]) {}

  record(event: AnalyticsEvent): void {
    for (const sink of this.sinks) {
      try {
        sink.record(event);
      } catch (err) {
        logger.warn(
          { sink: sink.constructor.name, event: event.event, err },
          "Sink failed — continuing to next",
        );
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run backend/tests/analytics-composite-sink.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Add product_events table to schema**

Add to `backend/src/db/schema.ts` after the `supportEvents` table definition:

```typescript
// ---------------------------------------------------------------------------
// Product events — supplementary analytics for events with no canonical table
// (marketing page views, feature usage, AI quality signals)
// Privacy: typed columns only (no JSONB) — compile-time + schema-level guard
// ---------------------------------------------------------------------------

export const productEvents = pgTable(
  "product_events",
  {
    id: pk(),
    eventName: text("event_name").notNull(),
    sessionId: uuid("session_id"),
    locale: text("locale"),
    route: text("route"),
    source: text("source"),
    templateSlug: text("template_slug"),
    surface: text("surface"),
    durationMs: integer("duration_ms"),
    errorFamily: text("error_family"),
    createdAt: createdAt(),
  },
  (t) => ({
    eventNameTimeIdx: index("product_events_event_name_time_idx").on(t.eventName, t.createdAt),
    sessionIdx: index("product_events_session_idx").on(t.sessionId, t.createdAt),
  }),
);
```

Also add relations:

```typescript
export const productEventsRelations = relations(productEvents, ({ one }) => ({
  session: one(sessions, {
    fields: [productEvents.sessionId],
    references: [sessions.id],
  }),
}));
```

- [ ] **Step 6: Implement DbSink**

```typescript
// backend/src/modules/analytics/db-sink.ts
import type { AnalyticsSink, AnalyticsEvent } from "./index.js";
import { getDb, schema } from "../../db/index.js";
import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("analytics:db");

/** Events that should be persisted to the product_events table. */
const DB_EVENTS = new Set([
  "marketing_page_viewed",
  "draft_entry_started",
  "template_selected",
  "page_viewed",
  "feature_used",
  "render_failed",
  "ai_generation_requested",
  "ai_generation_completed",
]);

export class DbSink implements AnalyticsSink {
  record(event: AnalyticsEvent): void {
    if (!DB_EVENTS.has(event.event)) return;

    const db = getDb();
    db.insert(schema.productEvents)
      .values({
        eventName: event.event,
        sessionId: "sessionId" in event ? (event as { sessionId: string }).sessionId : undefined,
        locale: "locale" in event ? (event as { locale: string }).locale : undefined,
        route: "route" in event ? (event as { route: string }).route : undefined,
        source: "source" in event ? (event as { source: string }).source : undefined,
        templateSlug: "templateSlug" in event ? (event as { templateSlug: string }).templateSlug : undefined,
        surface: "surface" in event ? (event as { surface: string }).surface : undefined,
        durationMs: "durationMs" in event ? (event as { durationMs: number }).durationMs : undefined,
        errorFamily: "errorFamily" in event ? (event as { errorFamily: string }).errorFamily : undefined,
      })
      .execute()
      .catch((err) => {
        logger.warn({ event: event.event, err }, "Failed to persist product event");
      });
  }
}
```

- [ ] **Step 7: Add new event types to analytics/index.ts**

Add these to the `AnalyticsEvent` union type (after the existing events):

```typescript
  // §4.6 Rendering
  | { event: "render_completed"; draftId: string; durationMs: number }
  | { event: "render_failed"; draftId: string; errorFamily: string }
  // §4.7 Page and feature tracking (supplementary)
  | { event: "page_viewed"; route: string; locale: string; sessionId?: string }
  | { event: "feature_used"; surface: string; locale: string; sessionId?: string }
  // §4.8 AI quality
  | { event: "ai_generation_requested"; draftId: string; locale: string }
  | { event: "ai_generation_completed"; draftId: string; durationMs: number; wasRefusal: boolean };
```

Add corresponding constants to `ANALYTICS_EVENTS`:

```typescript
  // Rendering
  RENDER_COMPLETED: "render_completed",
  RENDER_FAILED: "render_failed",
  // Page & feature
  PAGE_VIEWED: "page_viewed",
  FEATURE_USED: "feature_used",
  // AI quality
  AI_GENERATION_REQUESTED: "ai_generation_requested",
  AI_GENERATION_COMPLETED: "ai_generation_completed",
```

- [ ] **Step 8: Wire CompositeSink as default**

Replace the singleton section in `analytics/index.ts`:

```typescript
import { CompositeSink } from "./composite-sink.js";
import { DbSink } from "./db-sink.js";

// ---------------------------------------------------------------------------
// Active sink — composite by default (log + DB), replaceable for testing
// ---------------------------------------------------------------------------

const defaultSink: AnalyticsSink = new CompositeSink([logSink, new DbSink()]);
let _sink: AnalyticsSink = defaultSink;

export function setAnalyticsSink(sink: AnalyticsSink): void {
  _sink = sink;
}

export function resetAnalyticsSink(): void {
  _sink = defaultSink;
}
```

- [ ] **Step 9: Push schema to dev database**

Run: `cd backend && npm run db:push`
Expected: Table `product_events` created with indexes

- [ ] **Step 10: Run full test suite**

Run: `npm test`
Expected: All existing tests pass + new CompositeSink tests pass

- [ ] **Step 11: Commit**

```bash
git add backend/src/modules/analytics/ backend/src/db/schema.ts backend/tests/analytics-composite-sink.test.ts
git commit -m "feat(analytics): add CompositeSink, DbSink, and product_events table

Multi-sink architecture fans events to log + DB simultaneously.
DbSink persists only marketing/page-view events (no canonical table equivalent).
product_events uses typed columns only (no JSONB) for privacy safety.
Adds render_completed, render_failed, page_viewed, feature_used, and AI quality events.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Shared Types — Admin Response Contracts + Query Keys

**Files:**
- Modify: `shared/src/contracts/index.ts`
- Modify: `shared/src/query-keys.ts`

- [ ] **Step 1: Add admin response types to contracts**

Append to `shared/src/contracts/index.ts`:

```typescript
// ---------------------------------------------------------------------------
// Admin dashboard contracts
// ---------------------------------------------------------------------------

export interface AdminSummaryResponse {
  activeSessions: number;
  lettersSent: number;
  revenueCents: number;
  errorRate: number;
  periodLabel: string;
  generatedAt: string;
}

export interface AdminActiveResponse {
  total: number;
  byStage: {
    browsing: number;
    drafting: number;
    review: number;
    checkout: number;
    confirmation: number;
  };
  generatedAt: string;
}

export interface AdminFunnelStep {
  stage: string;
  count: number;
  dropOffPercent: number | null;
}

export interface AdminFunnelResponse {
  steps: AdminFunnelStep[];
  overallConversionPercent: number;
  byLocale: Record<string, number>;
  periodLabel: string;
  generatedAt: string;
}

export interface AdminErrorEntry {
  errorFamily: string;
  count: number;
  affectedSessions: number;
}

export interface AdminErrorsResponse {
  entries: AdminErrorEntry[];
  totalErrors: number;
  periodLabel: string;
  generatedAt: string;
}

export interface AdminLocaleEntry {
  locale: string;
  count: number;
  percent: number;
}

export interface AdminLocaleResponse {
  entries: AdminLocaleEntry[];
  generatedAt: string;
}

export interface AdminAiResponse {
  avgLatencyMs: number;
  refusalRate: number;
  regenerationRate: number;
  totalRequests: number;
  periodLabel: string;
  generatedAt: string;
}

export interface AdminSessionListItem {
  id: string;
  locale: string | null;
  email: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  draftCount: number;
  latestDraftStatus: string | null;
  paymentState: string | null;
}

export interface AdminSessionListResponse {
  sessions: AdminSessionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminRetentionInfo {
  contentRetentionDays: number;
  sessionTtlHours: number;
  pdfRetentionHours: number;
  auditRetentionDays: number;
  recentCleanups: Array<{
    type: string;
    count: number;
    ranAt: string;
  }>;
  pendingExpirations: {
    expiredSessions: number;
    expiredContent: number;
    expiredPdfs: number;
  };
  generatedAt: string;
}
```

- [ ] **Step 2: Add admin query keys**

Extend `shared/src/query-keys.ts`:

```typescript
export const queryKeys = {
  // ... existing keys unchanged ...
  admin: {
    summary: (period: string) => ["admin", "summary", period] as const,
    active: () => ["admin", "active"] as const,
    funnel: (period: string) => ["admin", "funnel", period] as const,
    errors: (period: string) => ["admin", "errors", period] as const,
    locale: () => ["admin", "locale"] as const,
    ai: (period: string) => ["admin", "ai", period] as const,
    health: () => ["admin", "health"] as const,
    overview: () => ["admin", "overview"] as const,
    sessions: (page: number, filters: string) => ["admin", "sessions", page, filters] as const,
    session: (id: string) => ["admin", "sessions", id] as const,
    timeline: (draftId: string) => ["admin", "drafts", draftId, "timeline"] as const,
    retention: () => ["admin", "retention"] as const,
    search: (q: string) => ["admin", "search", q] as const,
  },
} as const;
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add shared/src/contracts/index.ts shared/src/query-keys.ts
git commit -m "feat(shared): add admin dashboard response types and query keys

Defines typed contracts for all admin metric endpoints.
Adds admin query key factory for TanStack Query cache management.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Backend — Admin Metrics Endpoints

**Files:**
- Create: `backend/src/modules/admin/admin-metrics.routes.ts`
- Create: `backend/tests/admin-metrics.test.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts` (register new routes)

- [ ] **Step 1: Write tests for metric endpoint response shapes**

```typescript
// backend/tests/admin-metrics.test.ts
import { describe, it, expect } from "vitest";

// Unit tests for the query-building logic — we test the SQL builders
// in isolation since integration tests require a running DB.

describe("admin metrics", () => {
  it("parsePeriodInterval returns valid SQL intervals", () => {
    // We'll import this helper from admin-metrics.routes.ts
    const { parsePeriodInterval } = require("../src/modules/admin/admin-metrics.routes.js");
    expect(parsePeriodInterval("today")).toBe("1 day");
    expect(parsePeriodInterval("7d")).toBe("7 days");
    expect(parsePeriodInterval("30d")).toBe("30 days");
    expect(parsePeriodInterval("garbage")).toBe("7 days"); // default
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run backend/tests/admin-metrics.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement admin-metrics.routes.ts**

```typescript
// backend/src/modules/admin/admin-metrics.routes.ts
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import type {
  AdminSummaryResponse,
  AdminActiveResponse,
  AdminFunnelResponse,
  AdminFunnelStep,
  AdminErrorsResponse,
  AdminLocaleResponse,
  AdminAiResponse,
} from "../../../../shared/src/contracts/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function parsePeriodInterval(period: string | undefined): string {
  switch (period) {
    case "today": return "1 day";
    case "7d": return "7 days";
    case "30d": return "30 days";
    default: return "7 days";
  }
}

function periodLabel(period: string | undefined): string {
  switch (period) {
    case "today": return "Today";
    case "30d": return "Last 30 days";
    default: return "Last 7 days";
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function adminMetricsRoutes(app: FastifyInstance): Promise<void> {

  // GET /admin/metrics/summary — KPI cards
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/summary",
    async (request, reply) => {
      const db = getDb();
      const interval = parsePeriodInterval(request.query.period);
      const label = periodLabel(request.query.period);

      const [sessions, letters, revenue, errors, totalDrafts] = await Promise.all([
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM sessions
          WHERE created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM dispatch_attempts
          WHERE state IN ('accepted', 'submitted')
            AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ total: string }>(sql`
          SELECT COALESCE(SUM(amount_cents), 0)::int AS total FROM payment_attempts
          WHERE state = 'captured'
            AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM payment_attempts
          WHERE state = 'failed'
            AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM draft_letters
          WHERE created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
      ]);

      const totalD = Number(totalDrafts.rows[0]?.count ?? 0);
      const failedCount = Number(errors.rows[0]?.count ?? 0);

      const response: AdminSummaryResponse = {
        activeSessions: Number(sessions.rows[0]?.count ?? 0),
        lettersSent: Number(letters.rows[0]?.count ?? 0),
        revenueCents: Number(revenue.rows[0]?.total ?? 0),
        errorRate: totalD > 0 ? Math.round((failedCount / totalD) * 1000) / 10 : 0,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      };
      reply.send(response);
    },
  );

  // GET /admin/metrics/active — current active sessions by stage
  app.get("/admin/metrics/active", async (_request, reply) => {
    const db = getDb();
    const cutoff = sql.raw("INTERVAL '15 minutes'");

    const [total, drafting, review, checkout, confirmation] = await Promise.all([
      db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count FROM sessions
        WHERE expires_at > NOW() OR created_at > NOW() - ${cutoff}
      `),
      db.execute<{ count: string }>(sql`
        SELECT COUNT(DISTINCT s.id)::int AS count
        FROM sessions s JOIN draft_letters d ON d.session_id = s.id
        WHERE d.status IN ('collecting', 'fields_complete')
          AND d.updated_at > NOW() - ${cutoff}
      `),
      db.execute<{ count: string }>(sql`
        SELECT COUNT(DISTINCT s.id)::int AS count
        FROM sessions s JOIN draft_letters d ON d.session_id = s.id
        WHERE d.status = 'reviewed'
          AND d.updated_at > NOW() - ${cutoff}
      `),
      db.execute<{ count: string }>(sql`
        SELECT COUNT(DISTINCT s.id)::int AS count
        FROM sessions s JOIN payment_attempts p ON p.session_id = s.id
        WHERE p.state = 'pending'
          AND p.updated_at > NOW() - ${cutoff}
      `),
      db.execute<{ count: string }>(sql`
        SELECT COUNT(DISTINCT s.id)::int AS count
        FROM sessions s JOIN dispatch_attempts da ON da.session_id = s.id
        WHERE da.state IN ('accepted', 'submitted')
          AND da.updated_at > NOW() - ${cutoff}
      `),
    ]);

    const t = Number(total.rows[0]?.count ?? 0);
    const d = Number(drafting.rows[0]?.count ?? 0);
    const r = Number(review.rows[0]?.count ?? 0);
    const c = Number(checkout.rows[0]?.count ?? 0);
    const conf = Number(confirmation.rows[0]?.count ?? 0);

    const response: AdminActiveResponse = {
      total: t,
      byStage: {
        browsing: Math.max(0, t - d - r - c - conf),
        drafting: d,
        review: r,
        checkout: c,
        confirmation: conf,
      },
      generatedAt: new Date().toISOString(),
    };
    reply.send(response);
  });

  // GET /admin/metrics/funnel — conversion funnel
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/funnel",
    async (request, reply) => {
      const db = getDb();
      const interval = parsePeriodInterval(request.query.period);
      const label = periodLabel(request.query.period);

      const [sessions, drafts, reviewed, checkouts, paid, dispatched] = await Promise.all([
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM sessions
          WHERE created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM draft_letters
          WHERE created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM draft_letters
          WHERE status NOT IN ('collecting', 'fields_complete')
            AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM payment_attempts
          WHERE created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM payment_attempts
          WHERE state = 'captured'
            AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM dispatch_attempts
          WHERE state IN ('accepted', 'submitted')
            AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        `),
      ]);

      const counts = [
        { stage: "Sessions", count: Number(sessions.rows[0]?.count ?? 0) },
        { stage: "Draft Started", count: Number(drafts.rows[0]?.count ?? 0) },
        { stage: "Review Reached", count: Number(reviewed.rows[0]?.count ?? 0) },
        { stage: "Checkout", count: Number(checkouts.rows[0]?.count ?? 0) },
        { stage: "Payment OK", count: Number(paid.rows[0]?.count ?? 0) },
        { stage: "Dispatched", count: Number(dispatched.rows[0]?.count ?? 0) },
      ];

      const steps: AdminFunnelStep[] = counts.map((step, i) => ({
        stage: step.stage,
        count: step.count,
        dropOffPercent: i === 0 || counts[i - 1].count === 0
          ? null
          : Math.round((1 - step.count / counts[i - 1].count) * 1000) / 10,
      }));

      const sessionCount = counts[0].count;
      const dispatchCount = counts[counts.length - 1].count;

      // Locale breakdown — conversion % per locale
      const localeRows = await db.execute<{ locale: string; sessions: string; dispatched: string }>(sql`
        SELECT
          s.locale,
          COUNT(DISTINCT s.id)::int AS sessions,
          COUNT(DISTINCT da.id)::int AS dispatched
        FROM sessions s
        LEFT JOIN dispatch_attempts da ON da.session_id = s.id
          AND da.state IN ('accepted', 'submitted')
          AND da.created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        WHERE s.created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
          AND s.locale IS NOT NULL
        GROUP BY s.locale
      `);

      const byLocale: Record<string, number> = {};
      for (const row of localeRows.rows) {
        const sess = Number(row.sessions);
        const disp = Number(row.dispatched);
        byLocale[row.locale] = sess > 0 ? Math.round((disp / sess) * 1000) / 10 : 0;
      }

      const response: AdminFunnelResponse = {
        steps,
        overallConversionPercent: sessionCount > 0
          ? Math.round((dispatchCount / sessionCount) * 1000) / 10
          : 0,
        byLocale,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      };
      reply.send(response);
    },
  );

  // GET /admin/metrics/errors — error aggregation
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/errors",
    async (request, reply) => {
      const db = getDb();
      const interval = parsePeriodInterval(request.query.period);
      const label = periodLabel(request.query.period);

      const rows = await db.execute<{ family: string; count: string; sessions: string }>(sql`
        SELECT
          error_family AS family,
          COUNT(*)::int AS count,
          COUNT(DISTINCT session_id)::int AS sessions
        FROM product_events
        WHERE error_family IS NOT NULL
          AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        GROUP BY error_family
        ORDER BY count DESC
        LIMIT 20
      `);

      // Also count payment failures as errors
      const paymentErrors = await db.execute<{ count: string; sessions: string }>(sql`
        SELECT COUNT(*)::int AS count, COUNT(DISTINCT session_id)::int AS sessions
        FROM payment_attempts
        WHERE state = 'failed'
          AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
      `);

      const entries = rows.rows.map((r) => ({
        errorFamily: r.family,
        count: Number(r.count),
        affectedSessions: Number(r.sessions),
      }));

      // Prepend payment_failed if it has counts
      const pf = paymentErrors.rows[0];
      if (pf && Number(pf.count) > 0) {
        entries.unshift({
          errorFamily: "payment_failed",
          count: Number(pf.count),
          affectedSessions: Number(pf.sessions),
        });
      }

      const totalErrors = entries.reduce((sum, e) => sum + e.count, 0);

      const response: AdminErrorsResponse = {
        entries,
        totalErrors,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      };
      reply.send(response);
    },
  );

  // GET /admin/metrics/locale — session distribution by locale
  app.get("/admin/metrics/locale", async (_request, reply) => {
    const db = getDb();

    const rows = await db.execute<{ locale: string; count: string }>(sql`
      SELECT locale, COUNT(*)::int AS count
      FROM sessions
      WHERE locale IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY locale
      ORDER BY count DESC
    `);

    const total = rows.rows.reduce((sum, r) => sum + Number(r.count), 0);
    const entries = rows.rows.map((r) => ({
      locale: r.locale,
      count: Number(r.count),
      percent: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
    }));

    const response: AdminLocaleResponse = {
      entries,
      generatedAt: new Date().toISOString(),
    };
    reply.send(response);
  });

  // GET /admin/metrics/ai — AI quality metrics
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/ai",
    async (request, reply) => {
      const db = getDb();
      const interval = parsePeriodInterval(request.query.period);
      const label = periodLabel(request.query.period);

      const rows = await db.execute<{
        total: string;
        avg_duration: string;
        refusals: string;
        regenerations: string;
      }>(sql`
        SELECT
          COUNT(*) FILTER (WHERE event_name = 'ai_generation_completed')::int AS total,
          COALESCE(AVG(duration_ms) FILTER (WHERE event_name = 'ai_generation_completed'), 0)::int AS avg_duration,
          COUNT(*) FILTER (WHERE event_name = 'ai_generation_completed' AND error_family = 'refusal')::int AS refusals,
          COUNT(*) FILTER (WHERE event_name = 'ai_generation_requested')::int AS regenerations
        FROM product_events
        WHERE event_name IN ('ai_generation_completed', 'ai_generation_requested')
          AND created_at > NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
      `);

      const r = rows.rows[0];
      const total = Number(r?.total ?? 0);
      const requests = Number(r?.regenerations ?? 0);

      const response: AdminAiResponse = {
        avgLatencyMs: Number(r?.avg_duration ?? 0),
        refusalRate: total > 0 ? Math.round((Number(r?.refusals ?? 0) / total) * 1000) / 10 : 0,
        regenerationRate: requests > 0 && total > 0
          ? Math.round(((requests - total) / total) * 1000) / 10
          : 0,
        totalRequests: requests,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      };
      reply.send(response);
    },
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run backend/tests/admin-metrics.test.ts`
Expected: PASS

- [ ] **Step 5: Register routes in admin.routes.ts**

Add import and registration in `backend/src/modules/admin/admin.routes.ts`:

```typescript
import { adminMetricsRoutes } from "./admin-metrics.routes.js";
```

Inside `adminRoutes` function, add:

```typescript
  await app.register(adminMetricsRoutes);
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/admin/admin-metrics.routes.ts backend/tests/admin-metrics.test.ts backend/src/modules/admin/admin.routes.ts
git commit -m "feat(admin): add metric endpoints for dashboard

Endpoints: summary, active, funnel, errors, locale, AI quality.
All queries hit canonical tables directly — no parallel analytics store.
Time-range filtering via period query param (today, 7d, 30d).

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Backend — Sessions List + Single-Session Clear

**Files:**
- Create: `backend/src/modules/admin/admin-sessions.routes.ts`
- Create: `backend/tests/admin-sessions.test.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`

- [ ] **Step 1: Write tests**

```typescript
// backend/tests/admin-sessions.test.ts
import { describe, it, expect } from "vitest";

describe("admin sessions", () => {
  it("parseSessionFilters returns valid defaults", () => {
    const { parseSessionFilters } = require("../src/modules/admin/admin-sessions.routes.js");
    const result = parseSessionFilters({});
    expect(result).toEqual({
      status: "all",
      page: 1,
      pageSize: 50,
      fromDate: null,
      toDate: null,
    });
  });

  it("parseSessionFilters clamps page size", () => {
    const { parseSessionFilters } = require("../src/modules/admin/admin-sessions.routes.js");
    const result = parseSessionFilters({ pageSize: "500" });
    expect(result.pageSize).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run backend/tests/admin-sessions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement admin-sessions.routes.ts**

```typescript
// backend/src/modules/admin/admin-sessions.routes.ts
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { recordSupportEvent } from "./index.js";
import { env } from "../../shared/config/index.js";
import type {
  AdminSessionListResponse,
  AdminSessionListItem,
} from "../../../../shared/src/contracts/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SessionFilters {
  status: "all" | "active" | "expired";
  page: number;
  pageSize: number;
  fromDate: string | null;
  toDate: string | null;
}

export function parseSessionFilters(query: Record<string, unknown>): SessionFilters {
  const status = ["all", "active", "expired"].includes(query.status as string)
    ? (query.status as SessionFilters["status"])
    : "all";
  const page = Math.max(1, Number(query.page) || 1);
  const rawSize = Number(query.pageSize) || 50;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const fromDate = typeof query.fromDate === "string" ? query.fromDate : null;
  const toDate = typeof query.toDate === "string" ? query.toDate : null;
  return { status, page, pageSize, fromDate, toDate };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function adminSessionsRoutes(app: FastifyInstance): Promise<void> {

  // GET /admin/sessions — paginated session list with filters
  app.get<{ Querystring: Record<string, string> }>(
    "/admin/sessions",
    async (request, reply) => {
      const db = getDb();
      const filters = parseSessionFilters(request.query);
      const offset = (filters.page - 1) * filters.pageSize;

      const conditions: string[] = ["1=1"];
      if (filters.status === "active") conditions.push("s.expires_at > NOW()");
      if (filters.status === "expired") conditions.push("(s.expires_at IS NOT NULL AND s.expires_at <= NOW())");
      if (filters.fromDate) conditions.push(`s.created_at >= '${filters.fromDate}'::timestamptz`);
      if (filters.toDate) conditions.push(`s.created_at <= '${filters.toDate}'::timestamptz`);

      const where = conditions.join(" AND ");

      const [rows, countResult] = await Promise.all([
        db.execute<{
          id: string;
          locale: string | null;
          email: string | null;
          created_at: string;
          last_activity_at: string | null;
          draft_count: string;
          latest_draft_status: string | null;
          payment_state: string | null;
        }>(sql.raw(`
          SELECT
            s.id,
            s.locale,
            s.email,
            s.created_at::text,
            (SELECT MAX(d.updated_at) FROM draft_letters d WHERE d.session_id = s.id)::text AS last_activity_at,
            (SELECT COUNT(*) FROM draft_letters d WHERE d.session_id = s.id)::int AS draft_count,
            (SELECT d.status FROM draft_letters d WHERE d.session_id = s.id ORDER BY d.updated_at DESC LIMIT 1) AS latest_draft_status,
            (SELECT p.state FROM payment_attempts p WHERE p.session_id = s.id ORDER BY p.updated_at DESC LIMIT 1) AS payment_state
          FROM sessions s
          WHERE ${where}
          ORDER BY s.created_at DESC
          LIMIT ${filters.pageSize} OFFSET ${offset}
        `)),
        db.execute<{ count: string }>(sql.raw(`
          SELECT COUNT(*)::int AS count FROM sessions s WHERE ${where}
        `)),
      ]);

      const sessions: AdminSessionListItem[] = rows.rows.map((r) => ({
        id: r.id,
        locale: r.locale,
        email: r.email,
        createdAt: r.created_at,
        lastActivityAt: r.last_activity_at,
        draftCount: Number(r.draft_count),
        latestDraftStatus: r.latest_draft_status,
        paymentState: r.payment_state,
      }));

      const response: AdminSessionListResponse = {
        sessions,
        total: Number(countResult.rows[0]?.count ?? 0),
        page: filters.page,
        pageSize: filters.pageSize,
      };
      reply.send(response);
    },
  );

  // POST /admin/sessions/:id/clear — clear session content (GDPR use case)
  app.post<{ Params: { id: string }; Body: { reason: string } }>(
    "/admin/sessions/:id/clear",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;
      const { reason } = request.body ?? {};

      if (!reason || reason.length < 5) {
        return reply.status(400).send({
          error: { code: "REASON_REQUIRED", message: "Reason must be at least 5 characters" },
        });
      }

      // Verify session exists
      const [session] = await db
        .select({ id: schema.sessions.id })
        .from(schema.sessions)
        .where(sql`${schema.sessions.id} = ${id}`)
        .limit(1);

      if (!session) throw notFoundError("Session not found");

      // Clear draft content (subject, body) — preserves metadata
      const cleared = await db.execute<{ count: string }>(sql`
        UPDATE draft_letters
        SET subject = '[REDACTED]', body = '[REDACTED]', updated_at = NOW()
        WHERE session_id = ${id}
          AND subject != '[REDACTED]'
        RETURNING id
      `);

      // Record audit event
      await recordSupportEvent(db, {
        sessionId: id,
        eventType: "data_cleared",
        actor: env().ADMIN_USERNAME,
        details: {
          reason,
          draftsCleared: cleared.rows.length,
        },
      });

      reply.send({
        cleared: cleared.rows.length,
        sessionId: id,
        message: `Cleared content for ${cleared.rows.length} draft(s). Metadata preserved.`,
      });
    },
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run backend/tests/admin-sessions.test.ts`
Expected: PASS

- [ ] **Step 5: Register in admin.routes.ts**

Add import and register `adminSessionsRoutes` in `admin.routes.ts`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/admin/admin-sessions.routes.ts backend/tests/admin-sessions.test.ts backend/src/modules/admin/admin.routes.ts
git commit -m "feat(admin): add sessions list endpoint and single-session clear

Paginated session list with status/date filters.
GDPR-compliant single-session content clearing (redacts subject/body, preserves metadata).
All clear operations are audit-logged via support_events.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Backend — Retention Dashboard Endpoint

**Files:**
- Create: `backend/src/modules/admin/admin-retention.routes.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`

- [ ] **Step 1: Implement retention info endpoint**

```typescript
// backend/src/modules/admin/admin-retention.routes.ts
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import type { AdminRetentionInfo } from "../../../../shared/src/contracts/index.js";

export async function adminRetentionRoutes(app: FastifyInstance): Promise<void> {

  app.get("/admin/retention", async (_request, reply) => {
    const db = getDb();
    const config = env();

    const contentDays = Number(config.CONTENT_RETENTION_DAYS ?? 90);
    const sessionHours = Number(config.SESSION_TTL_HOURS ?? 24);
    const pdfHours = Number(config.PDF_RETENTION_HOURS_POST_DISPATCH ?? 72);
    const auditDays = Number(config.AUDIT_RETENTION_DAYS ?? 1095); // 3 years

    const [expiredSessions, expiredContent, expiredPdfs, recentCleanups] = await Promise.all([
      db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count FROM sessions
        WHERE expires_at IS NOT NULL AND expires_at <= NOW()
      `),
      db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count FROM draft_letters
        WHERE status = 'closed'
          AND subject != '[REDACTED]'
          AND updated_at < NOW() - ${sql.raw(`INTERVAL '${contentDays} days'`)}
      `),
      db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count FROM file_assets
        WHERE kind = 'render'
          AND deleted_at IS NULL
          AND created_at < NOW() - ${sql.raw(`INTERVAL '${pdfHours} hours'`)}
      `),
      db.execute<{ event_type: string; count: string; ran_at: string }>(sql`
        SELECT
          event_type,
          COUNT(*)::int AS count,
          MAX(created_at)::text AS ran_at
        FROM support_events
        WHERE event_type IN ('retention_cleanup', 'data_cleared', 'data_deletion_executed')
          AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY event_type
        ORDER BY ran_at DESC
      `),
    ]);

    const response: AdminRetentionInfo = {
      contentRetentionDays: contentDays,
      sessionTtlHours: sessionHours,
      pdfRetentionHours: pdfHours,
      auditRetentionDays: auditDays,
      recentCleanups: recentCleanups.rows.map((r) => ({
        type: r.event_type,
        count: Number(r.count),
        ranAt: r.ran_at,
      })),
      pendingExpirations: {
        expiredSessions: Number(expiredSessions.rows[0]?.count ?? 0),
        expiredContent: Number(expiredContent.rows[0]?.count ?? 0),
        expiredPdfs: Number(expiredPdfs.rows[0]?.count ?? 0),
      },
      generatedAt: new Date().toISOString(),
    };
    reply.send(response);
  });
}
```

- [ ] **Step 2: Register in admin.routes.ts**

Add import and register `adminRetentionRoutes`.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/admin/admin-retention.routes.ts backend/src/modules/admin/admin.routes.ts
git commit -m "feat(admin): add retention dashboard endpoint

Read-only visibility into retention config, pending expirations, and recent cleanups.
No manual trigger — automated retention via BullMQ remains the single cleanup path.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Frontend — Admin Auth Context + Sidebar Layout

**Files:**
- Create: `frontend/src/app/[locale]/admin/admin-auth-context.tsx`
- Create: `frontend/src/app/[locale]/admin/admin-sidebar.tsx`
- Create: `frontend/src/app/[locale]/admin/layout.tsx`
- Modify: `frontend/src/app/[locale]/admin/page.tsx`
- Modify: `frontend/src/app/[locale]/admin/admin-api.ts`

- [ ] **Step 1: Create auth context**

```typescript
// frontend/src/app/[locale]/admin/admin-auth-context.tsx
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AdminAuthState {
  authenticated: boolean;
  authHeader: string;
  login: (header: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [authHeader, setAuthHeader] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("admin_auth") ?? "";
  });

  const authenticated = authHeader.length > 0;

  const login = useCallback((header: string) => {
    sessionStorage.setItem("admin_auth", header);
    setAuthHeader(header);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("admin_auth");
    setAuthHeader("");
  }, []);

  return (
    <AdminAuthContext.Provider value={{ authenticated, authHeader, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Create sidebar component**

```typescript
// frontend/src/app/[locale]/admin/admin-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "./admin-auth-context";

const NAV_SECTIONS = [
  {
    label: "Dashboard",
    items: [
      { href: "overview", label: "Overview" },
      { href: "funnel", label: "Funnel Analysis" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "sessions", label: "Sessions" },
      { href: "flags", label: "Flags & Queue" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "retention", label: "Retention" },
      { href: "health", label: "Health" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAdminAuth();
  // Extract locale from pathname: /en-CH/admin/overview -> en-CH
  const locale = pathname.split("/")[1] ?? "en-CH";
  const basePath = `/${locale}/admin`;

  return (
    <nav
      className="flex w-[220px] shrink-0 flex-col border-r"
      style={{
        background: "var(--app-surface-strong)",
        borderColor: "var(--app-border)",
      }}
    >
      <div
        className="px-5 pb-6 pt-6 text-sm font-semibold tracking-wide"
        style={{ color: "var(--app-fg)" }}
      >
        ◆ SWISS MAIL ADMIN
      </div>

      <div className="flex flex-1 flex-col gap-0.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div
              className="px-5 pb-1.5 pt-4 text-[10px] uppercase tracking-widest"
              style={{ color: "var(--app-muted)" }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const href = `${basePath}/${item.href}`;
              const active = pathname.endsWith(`/${item.href}`) || pathname === href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className="block border-l-[3px] px-5 py-2.5 text-[13px] transition-colors"
                  style={{
                    borderColor: active ? "var(--app-fg)" : "transparent",
                    color: active ? "var(--app-fg)" : "var(--app-muted)",
                    background: active ? "var(--app-surface-muted)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <button
        onClick={logout}
        className="m-4 rounded-lg border px-4 py-2 text-xs"
        style={{
          borderColor: "var(--app-border)",
          color: "var(--app-muted)",
        }}
      >
        Sign Out
      </button>
    </nav>
  );
}
```

- [ ] **Step 3: Create admin layout**

```typescript
// frontend/src/app/[locale]/admin/layout.tsx
"use client";

import type { ReactNode } from "react";
import { AdminAuthProvider } from "./admin-auth-context";
import { AdminShell } from "./admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAuthProvider>
  );
}
```

Create `admin-shell.tsx` that handles the auth-gated layout:

```typescript
// frontend/src/app/[locale]/admin/admin-shell.tsx
"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useAdminAuth } from "./admin-auth-context";
import { AdminSidebar } from "./admin-sidebar";
import { makeAuthHeader } from "./admin-api";

export function AdminShell({ children }: { children: ReactNode }) {
  const { authenticated, login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!authenticated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--app-bg)" }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const header = makeAuthHeader(username, password);
            try {
              const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "/api";
              const res = await fetch(`${apiBase}/v1/admin/health`, {
                headers: { Authorization: header, "X-Requested-With": "XMLHttpRequest" },
              });
              if (!res.ok) throw new Error("Invalid credentials");
              login(header);
            } catch {
              setError("Invalid credentials");
            }
          }}
          className="w-full max-w-sm rounded-xl border p-8"
          style={{
            background: "var(--app-surface-strong)",
            borderColor: "var(--app-border)",
          }}
        >
          <h1 className="mb-6 text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
            Admin Login
          </h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-3 w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
            style={{
              background: "var(--app-surface-muted)",
              borderColor: "var(--app-border)",
              color: "var(--app-fg)",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
            style={{
              background: "var(--app-surface-muted)",
              borderColor: "var(--app-border)",
              color: "var(--app-fg)",
            }}
          />
          {error && (
            <p className="mb-3 text-xs" style={{ color: "#ef4444" }}>{error}</p>
          )}
          <button
            type="submit"
            className="btn-primary w-full rounded-lg py-2.5 text-sm font-medium"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--app-bg)" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Convert existing page.tsx to redirect**

Replace `frontend/src/app/[locale]/admin/page.tsx` content — it now just redirects to the overview sub-route:

```typescript
// frontend/src/app/[locale]/admin/page.tsx
import { redirect } from "next/navigation";

export default function AdminPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/admin/overview`);
}
```

- [ ] **Step 5: Update admin-api.ts with new fetch helpers**

Add new typed fetchers to `frontend/src/app/[locale]/admin/admin-api.ts` for all the new endpoints (summary, active, funnel, errors, locale, ai, sessions, retention). Keep the existing `adminFetch`, `makeAuthHeader`, and types. Add imports for the new shared contract types.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/\\[locale\\]/admin/
git commit -m "feat(admin): restructure admin to multi-page layout with sidebar

Auth context persists in sessionStorage across sub-pages.
Sidebar navigation with Overview, Funnel, Sessions, Flags, Retention, Health.
Login form gates all admin pages via shared AdminShell.
Uses app CSS tokens for consistent light/dark theming.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Frontend — Overview Dashboard Page

**Files:**
- Create: `frontend/src/app/[locale]/admin/admin-metric-panels.tsx`
- Create: `frontend/src/app/[locale]/admin/overview/page.tsx`

- [ ] **Step 1: Create reusable metric panel components**

Build `admin-metric-panels.tsx` with these components:
- `KpiCard` — number with label, optional change indicator
- `StageBreakdown` — list of stages with colored dots and counts
- `ErrorTable` — sortable list of error families with counts
- `LocaleBarChart` — horizontal bar chart using CSS widths
- `AiQualityGrid` — 3-column grid of AI metrics
- `PaymentHealthPanel` — payment state counts + success rate
- `DispatchHealthPanel` — dispatch state counts + acceptance rate
- `PeriodSelector` — time range pill buttons (today, 7d, 30d)

All components use `var(--app-*)` CSS tokens. No charting library — pure CSS `width` percentages for bars.

- [ ] **Step 2: Create overview page**

Build `overview/page.tsx` as a "use client" component that:
- Uses `useAdminAuth()` for the auth header
- Uses TanStack Query with `queryKeys.admin.summary(period)` and `refetchInterval: 15_000`
- Fetches: summary, active, errors, locale, ai, overview (existing)
- Renders: KPI row → active sessions + errors (2-col) → locale + AI (2-col) → payment + dispatch (2-col)
- Includes `PeriodSelector` in the page header

- [ ] **Step 3: Run typecheck and test in browser**

Run: `npm run typecheck`
Manually verify at `/en-CH/admin/overview`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/\\[locale\\]/admin/admin-metric-panels.tsx frontend/src/app/\\[locale\\]/admin/overview/
git commit -m "feat(admin): overview dashboard with KPIs, active sessions, errors, locale, AI, payment, dispatch

Polled every 15s via TanStack Query. Pure CSS bar charts.
Uses app color tokens for consistent dark/light theming.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Frontend — Funnel Analysis Page

**Files:**
- Create: `frontend/src/app/[locale]/admin/funnel/page.tsx`

- [ ] **Step 1: Build funnel page**

"use client" page that:
- Fetches `adminFetch<AdminFunnelResponse>('/admin/metrics/funnel?period=...')`
- Renders horizontal bar chart for each funnel step (CSS width based on max count)
- Shows drop-off percentages in red text beside each bar
- Shows overall conversion rate
- Shows locale breakdown table
- Uses `PeriodSelector` for time range

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\\[locale\\]/admin/funnel/
git commit -m "feat(admin): funnel analysis page with drop-off percentages and locale breakdown

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Frontend — Sessions List Page

**Files:**
- Create: `frontend/src/app/[locale]/admin/sessions/page.tsx`

- [ ] **Step 1: Build sessions list page**

"use client" page with:
- Status filter (all/active/expired) as pill buttons
- Date range inputs (from/to)
- Paginated table showing: ID (truncated), locale, email, created, last activity, draft count, status, payment state
- Click row → navigate to `/admin/sessions/[id]`
- Page navigation (prev/next) using the `total` and `page` from response

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\\[locale\\]/admin/sessions/page.tsx
git commit -m "feat(admin): sessions list with status/date filters and pagination

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Frontend — Session Detail (Timeline + Content Access + Refund + Clear)

**Files:**
- Create: `frontend/src/app/[locale]/admin/sessions/[id]/page.tsx`

- [ ] **Step 1: Build session detail page**

"use client" page that fetches:
1. Session details via `GET /admin/sessions/:id`
2. Draft timeline via `GET /admin/drafts/:draftId/timeline` (for each draft)

Renders:
- **Session header**: ID, locale, email, created, expires
- **Drafts list**: each draft with status badge
- **Timeline**: chronological event list with:
  - Color-coded type badges (green=success, red=failure, yellow=pending, blue=info)
  - Actor attribution (system/admin/webhook/provider)
  - Expandable metadata details
- **Action buttons** (per draft):
  - "View Content" — opens dialog requiring reason (5+ chars), calls `POST /admin/drafts/:id/view-content`, shows read-only content with "This access is audited" warning
  - "Initiate Refund" — visible only when payment state=captured, opens confirmation dialog with reason input, amount display, calls `POST /admin/drafts/:id/refund`
- **Session action**:
  - "Clear Session Data" — requires reason, calls `POST /admin/sessions/:id/clear`, shows confirmation with count of drafts to be redacted

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/\\[locale\\]/admin/sessions/\\[id\\]/
git commit -m "feat(admin): session detail with timeline, content access, refund, and data clearing

Timeline shows all events chronologically with actor attribution.
Content access requires reason and is audit-logged.
Refund UI with confirmation dialog and amount display.
Session clear redacts content while preserving metadata.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 11: Frontend — Remaining Admin Pages (Flags, Retention, Health)

**Files:**
- Create: `frontend/src/app/[locale]/admin/flags/page.tsx`
- Create: `frontend/src/app/[locale]/admin/retention/page.tsx`
- Create: `frontend/src/app/[locale]/admin/health/page.tsx`

- [ ] **Step 1: Build flags page**

Reuses existing overview data plus a suspicious-activity counter query. Shows:
- Ambiguous dispatches count + list
- Suspicious activity flags (simple count from sessions with multiple payment failures)
- Pending refunds

- [ ] **Step 2: Build retention page**

Fetches `GET /admin/retention`. Shows:
- Config values (content days, session TTL, PDF hours, audit days)
- Pending expirations (expired sessions, expired content, expired PDFs)
- Recent cleanup events table

- [ ] **Step 3: Build health page**

Move existing `HealthPanel` and `QueuesPanel` to the new health sub-page. Fetches `GET /admin/health`.

- [ ] **Step 4: Remove old panels from page.tsx**

The old `admin-panels.tsx` components (`HealthPanel`, `OverviewPanel`, `QueuesPanel`) are now consumed by their respective sub-pages. Keep the file but update imports.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/\\[locale\\]/admin/flags/ frontend/src/app/\\[locale\\]/admin/retention/ frontend/src/app/\\[locale\\]/admin/health/
git commit -m "feat(admin): flags, retention, and health sub-pages

Flags: ambiguous dispatch queue + suspicious activity counter + pending refunds.
Retention: read-only config visibility + pending expirations + recent cleanups.
Health: migrated from old overview into dedicated page.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 12: Privacy Notice Strip + Consent Infrastructure

**Files:**
- Create: `frontend/src/lib/consent.ts`
- Create: `frontend/src/components/product/PrivacyNoticeStrip.tsx`
- Create: `frontend/tests/privacy-notice-strip.test.ts`
- Modify: `frontend/src/app/[locale]/layout.tsx` (or root layout)

- [ ] **Step 1: Write failing test**

```typescript
// frontend/tests/privacy-notice-strip.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { getConsent, setConsent, hasAnalyticsConsent, isNoticeDisclosed } from "../src/lib/consent";

describe("consent module", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear?.();
  });

  it("defaults to analytics=false", () => {
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("persists analytics consent", () => {
    setConsent(true);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("notice not disclosed by default", () => {
    expect(isNoticeDisclosed()).toBe(false);
  });
});
```

- [ ] **Step 2: Implement consent module**

```typescript
// frontend/src/lib/consent.ts
export type ConsentCategory = "necessary" | "analytics";

export function getConsent(): Record<ConsentCategory, boolean> {
  if (typeof window === "undefined") return { necessary: true, analytics: false };
  const stored = localStorage.getItem("cookie_consent");
  if (!stored) return { necessary: true, analytics: false };
  try {
    return JSON.parse(stored);
  } catch {
    return { necessary: true, analytics: false };
  }
}

export function setConsent(analytics: boolean): void {
  localStorage.setItem(
    "cookie_consent",
    JSON.stringify({ necessary: true, analytics }),
  );
}

export function hasAnalyticsConsent(): boolean {
  return getConsent().analytics;
}

export function isNoticeDisclosed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("privacy_notice_seen") === "1";
}

export function dismissNotice(): void {
  localStorage.setItem("privacy_notice_seen", "1");
}
```

- [ ] **Step 3: Build PrivacyNoticeStrip component**

```typescript
// frontend/src/components/product/PrivacyNoticeStrip.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isNoticeDisclosed, dismissNotice } from "@/lib/consent";

export function PrivacyNoticeStrip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNoticeDisclosed()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t px-6 py-3 text-[13px]"
      style={{
        background: "var(--app-surface-strong)",
        borderColor: "var(--app-border)",
        color: "var(--app-muted)",
      }}
    >
      <span>
        🔒 We use only essential cookies for your session. No tracking. No ads.{" "}
        <Link
          href="/privacy"
          className="underline"
          style={{ color: "var(--app-fg)" }}
        >
          Privacy Policy
        </Link>
      </span>
      <button
        onClick={() => {
          dismissNotice();
          setVisible(false);
        }}
        className="ml-4 rounded-md border px-3 py-1 text-xs"
        style={{
          borderColor: "var(--app-border)",
          color: "var(--app-muted)",
        }}
      >
        Dismiss ×
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Add strip to app layout**

Import and render `<PrivacyNoticeStrip />` in the root layout or locale layout, outside the admin section.

- [ ] **Step 5: Run tests**

Run: `npx vitest run frontend/tests/privacy-notice-strip.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/consent.ts frontend/src/components/product/PrivacyNoticeStrip.tsx frontend/tests/privacy-notice-strip.test.ts
git commit -m "feat: add privacy notice strip with dormant consent infrastructure

Non-intrusive footer strip for essential-cookie notice.
Consent gate (hasAnalyticsConsent) ready for Umami integration — currently always false.
Dismissed state persists in localStorage.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 13: Update Mockup with App Colors + Final Polish

**Files:**
- Modify: `docs/superpowers/specs/admin-dashboard-mockup.html`

- [ ] **Step 1: Update mockup CSS to use app tokens**

Replace the hardcoded zinc/neutral colors with the app's actual tokens:
- Light mode: `--app-bg: #fffaf2`, surfaces: white/cream, text: `#18181b`
- Dark mode: `--app-bg: #0d1117`, surfaces: dark blue, text: `#e6edf3`
- Accent: use `var(--app-fg)` for active sidebar items (not amber — the app uses black/white contrast)

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/admin-dashboard-mockup.html
git commit -m "docs: update admin mockup to use app color tokens

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 14: Integration Testing + Documentation Update

**Files:**
- Modify: `docs/07-operations/analytics-and-observability.md`

- [ ] **Step 1: Run full validation suite**

Run: `npm run typecheck && npm test && npm run lint`
Expected: ALL PASS

- [ ] **Step 2: Update analytics-and-observability.md**

Add the new events (render_completed, render_failed, page_viewed, feature_used, ai_generation_requested, ai_generation_completed) to the event taxonomy section. Document the CompositeSink architecture and the product_events table.

- [ ] **Step 3: Final commit**

```bash
git add docs/
git commit -m "docs: update analytics event taxonomy with new events and sink architecture

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
