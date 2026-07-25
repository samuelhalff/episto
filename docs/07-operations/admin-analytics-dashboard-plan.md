# Admin Analytics Dashboard — Plan

**Status:** planning (Fable-designed, codex-reviewed). Not yet built.
**Date:** 2026-07-25
**Goal:** a high-level, visual admin dashboard the founder can glance at — KPIs that
schema-link to each other (drill from a top metric into its detail view). Data from the
Google APIs (GA4 + Google Ads, read-only) + our Postgres DB. Store minimal data on our end.

---

## Design spine

One mental model holds it together: **Traffic → Drafts → Payments → Dispatch → Money.**
Every view is a slice of that pipeline; every top KPI is a node; every drill-down follows an edge.

- **4 new views** — `Pulse` (glance), `Acquisition` (traffic in), `Revenue` (money out), `Operations` (fulfilment + support) — plus the **existing `/admin/funnel`** page retained as the conversion drill target (the middle of the pipeline; not duplicated).
- **One shared shell** (`AdminAnalyticsShell`): title row + global date-range picker + "compare to previous period" toggle, persisted in the URL (`?from=&to=&cmp=1`). Every drill link carries these params, so clicking a Pulse card into a detail view shows the same period — **that is the schema link.**
- **One repeating layout grammar** per view: KPI card row (value, Δ vs previous, sparkline) → chart band (1 time series + 1 breakdown) → 1 filterable table. Same grid, same tokens, everywhere.
- **Storage discipline:** nothing new persisted. DB metrics live-computed (60 s in-memory cache), GA4 cached 15 min, Google Ads cached 1 h, all server-side.

---

## 1. User stories

**Daily glance** — U1: single screen of today/this-week letters paid, net revenue, contribution, conversion, dispatch health vs prior period → 30-second health check. U2: abnormalities (rejected dispatches, pending refunds, payment failures, new feedback) surfaced as an alert strip so queues never need remembering.

**Acquisition** — U3: visits by channel/source over time. U4: per-campaign spend/clicks/CPC/purchases to kill campaigns that don't pay. U5: CPA next to contribution-per-letter to see if paid is unit-economically sane (CPA < ~CHF 2.30 or it's a loss).

**Conversion** — U6: visit → draft → checkout → paid → dispatched funnel with drop-offs (served by existing `/admin/funnel`, extended with a GA4 top step).

**Financials** — U7: gross revenue, VAT collected, discounts, refunds for any period (VAT filing in minutes). U8: **contribution** as the headline money number, not just gross. U9: promo-code performance (redemptions, revenue forgone, resulting paid letters) — do LAUNCH/WELCOME20 buy customers or burn margin?

**Operations** — U10: filterable table of every letter sent (date, locale, delivery type, amount, dispatch state, tracking). U11: dispatch success rate + rejected/unknown queue. U12: chronological feedback log + refund-request queue with linked payment.

---

## 2. Information architecture

```
/admin
├── Pulse          NEW default landing (overview's queue widgets migrate to Operations)
├── Acquisition    NEW (GA4 + Google Ads)
├── Funnel         EXISTING, gains a GA4 "visits" top step + shell/date-range
├── Revenue        NEW (receipts, refunds, promos, contribution)
├── Operations     NEW (letters table, dispatch, feedback, refund queue; absorbs /admin/overview queues)
└── existing: health, flags, retention, sessions, search, audience — unchanged, linked from drill-downs
```

**Drill-down map (the "schema") — a number is never a dead end:**

| Pulse KPI                                | drills to                  | then to                                         |
| ---------------------------------------- | -------------------------- | ----------------------------------------------- |
| Sessions                                 | Acquisition                | GA4 source/campaign rows → filtered table       |
| Conversion rate                          | Funnel                     | step → `/admin/sessions` / step-friction detail |
| Letters paid                             | Operations (letters table) | row → `/admin/search?draft=…`                   |
| Net revenue / Contribution               | Revenue                    | receipt row → linked draft                      |
| Dispatch success                         | Operations (dispatch)      | rejected row → draft record + tracking          |
| Refunds pending / Feedback (alert strip) | Operations (queues)        | item → draft/payment record                     |

---

## 3. Per-view layout (summary)

- **Pulse** — 4 KPI cards (Letters paid · Contribution · Conversion draft→paid · Sessions), an **alert strip** (rejected/unknown dispatch, refunds pending, payment-failure spike, new feedback — each renders only when count > 0), and **2 charts** (pipeline-over-time: sessions/drafts/paid; revenue vs contribution). **No table** — it's a glance screen (the key anti-widget-pile decision).
- **Acquisition** — KPIs (Sessions · Engaged % · Ad spend · Blended CPA). Charts: sessions by channel over time; locale/geo split. Tabbed tables: Sources (GA4); Campaigns (Ads: impressions/clicks/CPC/spend/conversions/CPA/**ROAS** with a "directional only — last-click, low volume" caveat), empty-state until campaigns exist.
- **Funnel** (existing, upgraded) — wrap in shared shell, prepend a GA4 **visits** step, add a KPI row (Visit→draft % · Draft→checkout % · Checkout→paid % · Paid→dispatched %). Keep step-friction work.
- **Revenue** — KPIs (Gross · Net after refunds · VAT collected · **Contribution**, with per-letter subtitle). Charts: daily net+VAT with refunds as negative bars; delivery-type mix. Tabbed tables: Receipts (filters: deliveryType/promo/has-discount; CSV export for the accountant); Promo codes (redemptions, discount given, attributed paid letters); Refunds.
- **Operations** (the worklist) — KPIs (Letters dispatched · Dispatch success rate · Median pay→dispatch time · Refund rate). Chart: dispatch outcomes over time. Tabbed tables: **Letters** (date/locale/deliveryType/amount/payment state/dispatch state badge/tracking; filters: deliveryType, dispatch state, payment state, search); **Attention queue** (absorbs /admin/overview); **Feedback log**; **Refund requests** (act from here).

---

## 4. KPI dictionary (source + cadence)

Cadence: **L** = DB live-compute, 60 s cache · **G15** = GA4, 15 min · **A60** = Google Ads, 60 min. Money from cents fields; deltas vs previous equal-length period.

| KPI                                   | Formula                                                                                                                                              | Source                | Cadence |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| Sessions / Engaged % / by channel     | GA4 `sessions`, `engagedSessions/sessions`, dim `sessionDefaultChannelGroup`                                                                         | GA4 546701401         | G15     |
| Purchases (GA4)                       | GA4 `purchase` count/value                                                                                                                           | GA4                   | G15     |
| Ad spend / Clicks / CPC / Impressions | Ads `cost_micros`, `clicks`, cost/clicks, `impressions` per campaign                                                                                 | Ads 1968866701        | A60     |
| CPA (blended)                         | spend / GA4 purchases                                                                                                                                | Ads+GA4               | A60     |
| ROAS (caveated)                       | GA4 paid-channel purchase revenue / spend — directional only                                                                                         | Ads+GA4               | A60     |
| Drafts started                        | distinct sessions with `product_events.eventName='draft_entry_started'`                                                                              | DB                    | L       |
| Conversion (draft→paid)               | captured payments / drafts started                                                                                                                   | DB                    | L       |
| Visit→draft %                         | drafts started / GA4 sessions — cross-source, caveated                                                                                               | DB+GA4                | G15     |
| Letters paid                          | count `payment_attempts.state='captured'` by `capturedAt`                                                                                            | DB                    | L       |
| Gross / VAT / Discounts               | Σ `receipts.totalCents` / `vatCents` / `discountCents`                                                                                               | DB                    | L       |
| Refunds / rate                        | Σ refunded `amountCents`; refunded/captured count                                                                                                    | DB                    | L       |
| Net revenue                           | gross − refunds                                                                                                                                      | DB                    | L       |
| **Contribution**                      | Σ per captured letter: `netCents` − deliveryCost(deliveryType) − estStripeFee(total); constants in code, ~CHF 2.20–2.35/letter; labelled "estimated" | DB + config constants | L       |
| Dispatch success rate                 | (accepted+reconciled) / (attempts − queued/submitted)                                                                                                | DB                    | L       |
| Pay→dispatch time (p50/p90)           | median(`submittedAt` − `capturedAt`)                                                                                                                 | DB                    | L       |
| Payment failure rate                  | failed / (failed+captured+authorized)                                                                                                                | DB                    | L       |
| Promo redemptions                     | `promo_codes.redeemedCount` + Σ receipts by `promoCode`                                                                                              | DB                    | L       |
| Feedback count                        | count support_events feedback in range                                                                                                               | DB                    | L       |
| Repeat-buyer share                    | sessions with ≥2 captured payments / all paying sessions                                                                                             | DB                    | L       |

---

## 5. Components — shadcn only (no bespoke UI)

The admin has hand-rolled shadcn-style dialog/dropdown/popover/input/sheet/toggle-group and **no `components.json`**. Run `shadcn init`, map the theme to the existing tokens in `globals.css` (`--app-fg`→`--foreground`, `--app-border`→`--border`, `--app-surface-*`→`--card`/`--muted`) so added components inherit the admin look with zero bespoke styling; existing components stay.

| Element                                     | shadcn component                                                                                 | Status                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------- |
| KPI card (value+Δ+sparkline)                | `Card` + `Badge` + `Chart` sparkline                                                             | add Card, Badge, Chart        |
| View tabs / tabbed tables                   | `Tabs`                                                                                           | add                           |
| Date range picker                           | existing `Popover` + `Calendar` (range) + `Button`                                               | add Calendar, Button          |
| Compare toggle                              | existing `toggle-group`                                                                          | exists                        |
| Time series / stacked bars / donut          | `Chart` (**brings Recharts** — first chart lib; keep existing CSS bars on funnel to avoid churn) | add                           |
| Tables (letters/receipts/sources/campaigns) | `Table` + `Select` filters + existing `Input` + `Pagination`                                     | add Table, Select, Pagination |
| State chips (dispatch/payment/promo)        | `Badge` (variant per state)                                                                      | add                           |
| Caveats (ROAS/contribution)                 | `Tooltip`                                                                                        | add                           |
| Loading                                     | `Skeleton`                                                                                       | add                           |
| Pulse alert strip                           | `Alert`                                                                                          | add                           |
| Drill nav                                   | links styled `Button variant="ghost"`                                                            | Button                        |

Icons stay Lucide.

---

## 6. Additional views — folded in or cut

- **Cohorts/retention** → folded in (one "Repeat-buyer share" KPI on Revenue linking to existing `/admin/retention`; a full cohort grid is over-engineering for a low-frequency product).
- **Geo/locale** → folded into Acquisition (chart 2).
- **Delivery-tier mix** → folded into Revenue (chart 2) — moves contribution.
- **Promo performance** → Revenue table 2 (U9); watch LAUNCH's free path especially (free letters have **negative** contribution).
- **Cut as vanity:** pageviews, bounce rate, avg session duration as headline numbers, real-time counters, world maps — GA4 renders these if ever needed; they change no decision.
- **Not built:** aggregate/rollup tables — everything computes live in tens of ms; revisit only if `/admin/metrics/*` p95 > ~500 ms.

---

## 7. Backend additions (small, extend existing `/admin/metrics/*`)

`GET /admin/metrics/kpis?from&to` (one batched call for Pulse), `/admin/metrics/revenue`, `/admin/metrics/operations`, `/admin/metrics/ga4?report=…` and `/admin/metrics/ads` (server-side proxies with the caches above; GA4 uses the existing service account, Ads uses the read-only token from the `gads` setup). Table endpoints: `/admin/receipts`, `/admin/letters` (paginated + filters).

---

## 8. Phased build order (max signal first)

1. **Shell + Pulse (DB-only)** — shadcn init + token mapping; `AdminAnalyticsShell` (URL date range + compare); Card/Badge/Skeleton/Chart; `metrics/kpis`; Pulse with 3 DB cards (Sessions stubbed) + alert strip + revenue/contribution chart.
2. **Revenue** — receipts/promos/refunds tables, VAT + contribution, CSV export.
3. **Operations** — letters table, dispatch chart, queues (migrate `/admin/overview`), feedback log, refund queue; retire overview as landing in favour of Pulse.
4. **GA4** — Acquisition view; Sessions card goes live; GA4 step on Funnel.
5. **Google Ads** — campaign table, spend/CPA/ROAS cards — gated on campaigns existing (empty-state until then).

Each phase is independently shippable and leaves the admin coherent (no half-views).
