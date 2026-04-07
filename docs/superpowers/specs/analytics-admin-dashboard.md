# Analytics & Admin Dashboard — Design Spec

**Status:** Draft — awaiting user review
**Scope:** Admin dashboard metrics, analytics infrastructure, privacy notice, Umami-readiness

---

## Problem

Swiss Mail needs operational visibility into user behavior, conversion funnels, payment/dispatch health, and errors. The existing admin dashboard is a shell (login + basic health/overview panels). There is no cookie/privacy notice, and no analytics vendor — but the architecture must be ready for Umami integration later without refactoring.

## Design Decisions (locked after review)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Analytics vendor | None for MVP | Own DB tables already capture funnel data; add Umami when marketing starts |
| Data source | Canonical Drizzle tables | No parallel `analytics_events` table — avoids second source of truth |
| Supplementary events | Thin typed table for marketing-only events | Page views, feature usage — events with no canonical table equivalent |
| Admin page count | 4 sections (per admin-build-pack.md) | Overview, Funnel, Case Detail, Flags/Search |
| Real-time | Polling (10-30s) | WebSocket overkill for 2-5 person team |
| Log viewer | None | `docker logs \| jq` sufficient for team size |
| Cookie banner | Privacy notice strip only | Swiss nDSG doesn't require consent for essential-only cookies |
| Geography | Locale distribution from `sessions.locale` | Accept-Language ≠ geography; no IP geolocation for MVP |
| Umami readiness | `AnalyticsSink` adapter pattern (already exists) | Umami = new sink implementation, zero call-site changes |

---

## A. Analytics Infrastructure

### A.1 Supplementary Events Table

Only for events that have **no canonical table equivalent** — marketing page views, feature usage, AI quality signals. Funnel/payment/dispatch metrics come from existing canonical tables.

```sql
CREATE TABLE product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  session_id TEXT REFERENCES sessions(id),
  locale TEXT,
  route TEXT,
  source TEXT,
  template_slug TEXT,
  surface TEXT,
  duration_ms INTEGER,
  error_family TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_events_name_time ON product_events(event_name, created_at);
CREATE INDEX idx_product_events_session ON product_events(session_id, created_at);
```

**Privacy enforcement:** Typed columns only — no JSONB. The TypeScript `AnalyticsEvent` union type remains the compile-time privacy guard. The table schema is the runtime guard. No field can hold PII because no freeform field exists.

**Retention:** Configurable via `PRODUCT_EVENTS_RETENTION_DAYS` env var (default: 90). Cleaned by the existing retention job.

### A.2 New Events (extend existing taxonomy)

Add to the existing 22 events:

| Event | Purpose | Sink |
|-------|---------|------|
| `render_completed` | PDF render success + latency | Pino only (operational) |
| `render_failed` | PDF render failure | Pino + product_events |
| `page_viewed` | Server-side page view (route, locale) | product_events |
| `feature_used` | Feature adoption tracking (surface, action) | product_events |
| `ai_generation_requested` | AI drafting started | product_events |
| `ai_generation_completed` | AI drafting finished (durationMs, was_refusal) | product_events |

### A.3 Multi-Sink Architecture (Umami-ready)

The existing `AnalyticsSink` interface + `setAnalyticsSink()` already supports vendor swapping. For Umami readiness, we add a **composite sink** that fans out to multiple sinks simultaneously:

```typescript
// backend/src/modules/analytics/composite-sink.ts
export class CompositeSink implements AnalyticsSink {
  constructor(private sinks: AnalyticsSink[]) {}
  record(event: AnalyticsEvent): void {
    for (const sink of this.sinks) {
      try { sink.record(event); } catch { /* swallow per-sink errors */ }
    }
  }
}
```

**Current MVP:** `CompositeSink([logSink, dbSink])`
**When Umami added:** `CompositeSink([logSink, dbSink, umamiSink])`

No call-site changes. No refactoring. Just add a sink to the array.

### A.4 Frontend Analytics Hook (Umami-ready)

```typescript
// frontend/src/lib/analytics.ts
export function trackPageView(route: string, locale: string): void { ... }
export function trackEvent(name: string, data: Record<string, string | number>): void { ... }
```

**Current MVP:** Posts to `POST /api/analytics/event` (backend records in product_events).
**When Umami added:** Also calls `umami.track()` client-side (gated behind consent check).

The consent gate is a simple function check:

```typescript
function hasAnalyticsConsent(): boolean {
  return localStorage.getItem('analytics_consent') === 'accepted';
}
```

Currently always returns `false` (no Umami script loaded). When Umami is added, the consent banner flips this and loads the script.

---

## B. Admin Dashboard

### B.1 Architecture: 4 Sections (per admin-build-pack.md)

**Section 1: Overview** (extend existing `admin-panels.tsx`)
- Active sessions count (by funnel stage) — polled every 15s
- Today's metrics: letters sent, revenue (CHF), payment success rate, dispatch acceptance rate
- Error rate (last 24h) by family
- AI quality: avg generation latency, refusal rate
- Mini sparklines for 7-day trends (optional, nice-to-have)

**Section 2: Funnel** (new page)
- Step-by-step conversion: Session → Draft → Review → Checkout → Payment → Dispatch
- Drop-off percentages between each step
- Time range selector (today, 7d, 30d)
- Locale breakdown per step

**Section 3: Case Detail** (extend existing timeline view)
- Already exists — unified draft + payment + dispatch + support event timeline
- Add: analytics events overlay (page views, feature usage for that session)

**Section 4: Flags & Search** (extend existing)
- Already has ambiguous dispatch queue, suspicious activity
- Add: error aggregation panel (top 5 error families, affected session count)

### B.2 Backend Endpoints (new)

All under existing `/admin/*` route prefix with `requireAdmin` middleware.

```
GET /admin/metrics/active     — active sessions by stage (last 15min)
GET /admin/metrics/funnel     — conversion funnel with time range filter
GET /admin/metrics/summary    — today's KPIs (revenue, letters, errors)
GET /admin/metrics/errors     — error families aggregated (last 24h/7d/30d)
GET /admin/metrics/locale     — session distribution by locale
GET /admin/metrics/ai         — AI quality metrics (latency, refusals, regenerations)
```

**All queries hit canonical tables directly:**
- Active sessions: `SELECT COUNT(*) FROM sessions WHERE last_activity_at > NOW() - INTERVAL '15 minutes'`
- Funnel: count `draft_letters` by status, `payment_attempts` by state, `dispatch_attempts` by state
- Revenue: `SUM(amount_cents) FROM payment_attempts WHERE state = 'captured'`
- Errors: Aggregate from `support_events` and `product_events` where `error_family IS NOT NULL`

### B.3 Frontend Admin Components

Extend the existing `admin-panels.tsx` with new panel components:

- `ActiveSessionsCard` — number + stage breakdown
- `KpiCards` — 4-card row (letters, revenue, payment rate, dispatch rate)
- `FunnelChart` — horizontal bar chart (pure CSS/SVG, no charting library)
- `ErrorsPanel` — sortable table of error families
- `LocalePanel` — simple bar chart of locale distribution
- `AiQualityPanel` — latency + refusal rate cards

**No charting library.** Simple CSS bar charts and SVG sparklines keep the bundle lean and avoid dependency bloat. If richer charts are needed later, recharts is a reasonable addition.

### B.4 Polling Strategy

```typescript
// frontend/src/app/[locale]/admin/use-admin-polling.ts
const POLL_INTERVAL = 15_000; // 15 seconds

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminFetch('/admin/metrics/summary'),
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false, // stop when tab is hidden
  });
}
```

React Query already handles polling, caching, and background refetch. No new infrastructure.

---

## C. Privacy Notice Strip

### C.1 Component

A non-intrusive footer strip on first visit:

```
┌─────────────────────────────────────────────────────────┐
│ 🔒 We use only essential cookies for your session.      │
│    No tracking. No ads. [Privacy Policy →]  [Dismiss ×] │
└─────────────────────────────────────────────────────────┘
```

- Appears once, dismissable
- Dismissed state stored in `localStorage('privacy_notice_seen')`
- No backend audit needed (no consent choice being made)
- Styled to match the product's formal aesthetic

### C.2 Consent Infrastructure (dormant, Umami-ready)

Pre-build the consent gate so it's ready when Umami is added:

```typescript
// frontend/src/lib/consent.ts
export type ConsentCategory = 'necessary' | 'analytics';

export function getConsent(): Record<ConsentCategory, boolean> {
  const stored = localStorage.getItem('cookie_consent');
  if (!stored) return { necessary: true, analytics: false };
  return JSON.parse(stored);
}

export function setConsent(analytics: boolean): void {
  localStorage.setItem('cookie_consent', JSON.stringify({
    necessary: true,
    analytics,
  }));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent().analytics;
}
```

**Currently:** `hasAnalyticsConsent()` always returns `false`. No analytics cookies set.
**When Umami added:** The privacy notice strip upgrades to a consent banner with a real choice. `hasAnalyticsConsent()` gates `umami.track()` calls and Umami script loading.

---

## D. Umami Migration Path (future, not built now)

When marketing analytics is needed, the migration is:

1. Add Umami container to docker-compose (separate DB or shared PostgreSQL)
2. Create `UmamiSink implements AnalyticsSink` — posts events to Umami's collect endpoint
3. Add to CompositeSink: `new CompositeSink([logSink, dbSink, umamiSink])`
4. Upgrade privacy notice strip to consent banner with "Accept analytics" option
5. Gate Umami client-side script behind `hasAnalyticsConsent()`
6. Load `<script defer src="/umami/script.js" data-website-id="..." />` conditionally

**Estimated effort:** ~2-4 hours. Zero call-site changes. Zero refactoring.

---

## E. Files to Create/Modify

### New files:
- `backend/src/modules/analytics/composite-sink.ts` — multi-sink fan-out
- `backend/src/modules/analytics/db-sink.ts` — writes supplementary events to product_events table
- `backend/src/modules/admin/metrics.routes.ts` — new metric endpoints
- `backend/src/db/migrations/XXXX_product_events.ts` — DB migration
- `frontend/src/lib/consent.ts` — consent gate (dormant)
- `frontend/src/lib/analytics-client.ts` — frontend event tracking
- `frontend/src/components/product/PrivacyNoticeStrip.tsx` — privacy notice
- `frontend/src/app/[locale]/admin/funnel/page.tsx` — funnel analysis page
- `frontend/src/app/[locale]/admin/admin-metrics-panels.tsx` — new dashboard panels

### Modified files:
- `backend/src/modules/analytics/index.ts` — add new event types, use CompositeSink
- `backend/src/modules/admin/admin-overview.routes.ts` — extend with new metric queries
- `backend/src/db/schema.ts` — add product_events table
- `frontend/src/app/[locale]/admin/page.tsx` — integrate new panels
- `frontend/src/app/[locale]/admin/admin-panels.tsx` — extend with metrics panels
- `shared/src/contracts/index.ts` — add admin metric response types
- `shared/src/query-keys.ts` — add admin query keys
- `docs/07-operations/analytics-and-observability.md` — update with new events

---

## F. What This Does NOT Include (explicit non-goals)

- ❌ External analytics vendor (Umami, Plausible, etc.)
- ❌ Session replay or heatmaps
- ❌ Cookie consent banner (replaced by privacy notice strip)
- ❌ Log viewer in admin dashboard
- ❌ IP geolocation
- ❌ Charting library (CSS/SVG bar charts only)
- ❌ Role-based admin access (single shared credential for MVP)
- ❌ DSAR (data subject access request) UI — remains a manual support process
- ❌ A/B testing infrastructure
