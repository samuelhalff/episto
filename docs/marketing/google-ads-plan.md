# Google Ads plan — episto.ch

**Status:** planning only. Nothing has been changed in the Google Ads account. Review and decide before implementation.
**Date:** 2026-07-25
**Inputs:** product + funnel data (this repo, GA4 546701401), unit economics (pricing config), plus independent strategy reviews from Fable and codex (gpt-5.6). CPC figures are experience-based estimate ranges — validate in Google Keyword Planner (CH-only, per language) before spending.

---

## 0. The verdict, up front

**Single-order paid search is structurally unprofitable at episto's current margin. This is arithmetic, not a tuning problem.**

- episto's markup is **CHF 2.90 per letter** on both tiers (standard CHF 4.55, registered CHF 9.15 — the rest is Swiss Post postage). After Stripe fees, **net contribution ≈ CHF 2.20 (standard) / CHF 2.35 (registered)** per first order, before support/refund reserve.
- **Max profitable first-order CAC ≈ CHF 2.30.**
- Realistic Swiss CPCs for our terms are CHF 0.6–8. Even the _best_ case (cheapest product-match term at CHF 1.20, an ambitious 8% cold purchase rate) gives **CAC ≈ CHF 15 — ~6.5× over the ceiling.** The Krankenkasse cluster is ~40× over. To break even on one CHF 2.20 order at 5% CVR you'd need a CHF 0.11 CPC, which does not exist in Switzerland.

**Therefore paid search is run as a _measuring instrument_, not an acquisition channel** — a capped, time-boxed test that buys the three numbers we don't have (real purchase CVR, registered share, repeat rate) in weeks instead of the months SEO takes. It only ever becomes a real channel if AOV upsells and/or repeat purchase lift contribution well above CHF 2.30.

**Recommendation: ~CHF 1,100/month, 8-week hard cap (~CHF 2,200 total), scoped below.** Ship the AOV levers _before_ the first impression.

---

## 1. Prerequisites (do these before any spend)

1. **Purchase conversion tracking — currently missing.** GA4 shows `draft_entry_started` and `checkout_started` firing but **no `purchase` event**. You cannot optimize Ads to a conversion you don't record.
   - Fire a `purchase` conversion on the post-payment confirmation (server-side preferred; gtag at minimum), **value = contribution (2.20 / 2.35 + upsell margin), not gross revenue**, so later tROAS math doesn't lie.
   - Enable Enhanced Conversions (email is captured at checkout). Link GA4, but bid on the Ads-native tag (fresher, less modeled). Consent Mode v2 on.
2. **AOV levers live before spending** (the channel cannot work at CHF 2.20; lift it):
   - **Default cancellation intents to registered** — a dated delivery proof is the actual job-to-be-done for lease/insurance cancellations, and it lifts contribution to CHF 2.35 + higher trust.
   - **Paid human-review add-on** (~CHF 14.90, near-pure margin) → contribution jumps to ~CHF 15+ on attach.
   - **3-letter credit bundle** (~CHF 12) for Mahnung/dispute personas who send sequences.
   - If a 25% attach on a ~CHF 12-margin upsell holds, blended contribution ≈ CHF 5.30 and a CHF 6–8 CAC becomes a defensible LTV bet.
3. **Repeat-rate cohort instrumentation** in the DB (orders per paid-cohort buyer at 30/60/90 days). This single number decides whether Google Ads is ever more than a measuring instrument.

---

## 2. Campaign structure

All **Search**, exact + phrase only. **No Performance Max, no Display, no broad match** (PMax sprays a new domain's budget into Display/YouTube with no conversion history to steer it).

| #      | Campaign                                                                                                                | Lang  | Ad groups → example keywords (match)                                                                                                                                                                                                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | **DE — Einschreiben online** (core bet)                                                                                 | de    | _einschreiben online:_ `[einschreiben online versenden]`, `[einschreiben online aufgeben]`, `"einschreiben online"` · _brief online versenden:_ `[brief online versenden schweiz]`, `"brief online verschicken"`, `[brief versenden ohne drucker]` · _ohne post/schalter:_ `"einschreiben ohne post"`, `"brief verschicken ohne briefmarke"` |
| **C2** | **DE — Kündigung senden** (probe, exact-only)                                                                           | de    | _wohnung:_ `[wohnung kündigen einschreiben]`, `[mietvertrag kündigen einschreiben]` · _abo/handy/fitness:_ `[abo kündigen einschreiben]`, `[fitnessabo kündigen brief]` — **only with qualifier words** (einschreiben/senden/brief); naked "wohnung kündigen" is free-template intent, do not bid                                            |
| **C3** | **FR — Lettre recommandée en ligne**                                                                                    | fr    | _recommandée en ligne:_ `[lettre recommandée en ligne]`, `[envoyer recommandé en ligne]` · _résiliation:_ `[envoyer résiliation bail recommandé]`, `[lettre résiliation recommandée en ligne]`                                                                                                                                               |
| **C4** | **EN — Expat registered mail**                                                                                          | en    | `[send registered letter online switzerland]`, `[send letter online switzerland]`, `"cancel lease letter switzerland"` — tiny volume, near-zero competition, likely the cheapest conversions                                                                                                                                                 |
| **C5** | **DE/FR — Krankenkasse seasonal** (build now, **PAUSED** until ~Oct 20, run only with registered-default + upsell live) | de+fr | `[krankenkasse kündigen einschreiben]`, `[kündigung krankenkasse fristgerecht]`, `[résiliation assurance maladie recommandé]` — qualifier-only; never bid naked "krankenkasse kündigen" (CHF 3–8 comparator CPCs)                                                                                                                            |

**Skip at launch:** Italian (8% share — can't accumulate learnable data at this budget), Mahnung/Einsprache/Mietzins (too rare or B2B-ish; harvest later via search-terms report), and every naked template-satisfiable head term.

**Starter negative keywords (account-level; expand weekly from the search-terms report):**

- **DE:** gratis, kostenlos, muster, vorlage, word, pdf, beispiel, template, "wie schreibe ich", sendungsverfolgung, track, verfolgen, "nicht erhalten", abholen, verloren, öffnungszeiten, "porto preis", jobs, lehrstelle, login
- **FR:** gratuit, modèle, exemple, word, pdf, suivi, "tarif poste", horaires
- **EN:** free, template, sample, tracking, "post office hours"
- **Navigational/competitor:** comparis, klara, pingen, "swiss post login"

---

## 3. Geo & audience

- **Cantons (start):** DE → ZH, ZG, BS, BL, AG, BE, LU. FR → GE, VD (NE later). EN → ZH, ZG, GE, VD, BS only (~80% of expats).
- **Why these:** highest on every proxy that matters — expat share (GE ~40% foreign, BS ~37%, ZH ~27%), tenant rate (CH ~58% renters; city cores >75%), printer-less urban households, smartphone-first behaviour. Rural cantons skew homeowner/printer-owner → exclude for now.
- **Canton targeting, not radius** — Swiss commutes cross city lines; radius just adds noise at this scale.
- **Location option: "Presence" only** (not "presence or interest" — exclude non-residents researching Swiss topics).
- **Language:** DE campaigns → German **and** English (many Swiss-German users browse in English); FR → French + English; EN → English only.
- **Device:** all, no bid adjustments yet. Expect mobile-heavy; watch payment CVR on mobile before adjusting.
- **Audience observation (bid +0%, data only):** in-market "Moving & Relocation", in-market "Legal Services", life event "Recently moved", "Renters" where available. Positive-adjust after 4 weeks anything at ~2× CVR.

---

## 4. Budget

Learning floor: ~200–300 clicks/campaign to bound CVR, ~50 clicks/ad-group to read CTR. At ~CHF 1.00–1.50 blended CPC:

| Campaign              | CHF/day                      | Note                 |
| --------------------- | ---------------------------- | -------------------- |
| C1 DE einschreiben    | 15                           | core bet             |
| C3 FR recommandée     | 8                            | second-cheapest CPCs |
| C2 DE kündigung probe | 8                            | exact-only           |
| C4 EN expat           | 5                            | volume-limited       |
| C5 seasonal           | 0 → **20/day Oct 20–Nov 25** | deadline window only |
| **Total**             | **~36/day ≈ CHF 1,080/mo**   |                      |

**Minimum for a usable signal: ~CHF 1,000–1,200/month, 8 weeks, hard cap ~CHF 2,200.** That buys ~1,600–2,200 clicks — enough to tell "CVR ≈ 6–8%" from "CVR ≈ 2%" per core campaign, measure registered share and upsell attach, and seed a 50–120-buyer repeat-rate cohort. Below ~CHF 25/day per core campaign you're not testing, you're tipping Google.

---

## 5. Bidding

1. **Weeks 1–4 — Manual CPC** (eCPC off). Caps: C1/C2 CHF 1.50, C3 CHF 1.00, C4 CHF 1.20, C5 CHF 2.50. With zero history, smart bidding just explores expensively; caps are the only defence against CHF 4+ auctions.
2. **Weeks 3–6 —** where impression share <20% at cap **and** CVR looks alive, switch that campaign to **Maximize Clicks with a max-CPC cap** at the same numbers.
3. **tCPA only after ≥30 purchases in 30 days in one campaign** (likely requires consolidating C1+C2, later +C3). Set initial tCPA at _observed_ CAC, then walk down 15% every 2 weeks. **Never feed micro-conversions into bidding** — Google will optimize to draft-starters who never pay.

---

## 6. A/B testing & iteration

- **RSAs:** 2 per ad group, one angle each. **A — proof & deadline:** "Einschreiben online in 5 Min. / Fristgerecht mit Sendenachweis." **B — no-hassle:** "Ohne Drucker, ohne Post, ohne Briefmarke." Pin an "episto — Brief online versenden" headline to position 1; leave the rest unpinned. Judge CTR after ≥500 impressions/RSA (~2 weeks/ad group here).
- **Landing pages:** message-match — C1/C3/C4 → the "Einschreiben online" LP; C2 → the matching cancellation LPs (not the generic homepage). Test **registered-as-default vs choose-your-tier** as a _site-side sequential_ test (2 weeks each, all traffic) — at this volume Ads Experiments won't reach significance, so clean sequential beats noisy parallel.
- **Cadence:** search-terms sweep + negatives **weekly** (highest-ROI 20 minutes on a new account); ad/LP changes **bi-weekly, one variable at a time**; structural changes (pause/merge) **only at week 4 and week 8**. At ~30 clicks/day, every daily metric is noise — resist daily fiddling.
- **Decision rules:**
  - _Pause_ an ad group with >120 clicks and 0 purchases; drop/pause a keyword whose auction CPC runs >2× the campaign cap.
  - _Scale_ nothing on first-order CAC. Scale only a campaign showing blended CAC ≤ ~CHF 8 **and** (upsell attach ≥20% or an early repeat signal), in +30%/week steps — never doublings.

---

## 7. Measurement & 4-week thresholds

- **Primary conversion:** purchase (value = contribution). **Micro-conversions (observation only, never bid targets):** draft_started, draft_completed, checkout_started, registered_tier_selected, upsell_attached.
- **Cohort (in the DB, the source of truth):** repeat orders per paid-cohort buyer at 30/60/90 days.
- **KILL** a campaign if >300 clicks and CVR <2%, or CAC >CHF 30 with zero upsell attach.
- **CONTINUE** if CVR ≥4% on C1/C3/C4, or blended CAC ≤ CHF 15 with upsell live.
- **SUCCESS (unlock month 3+):** blended CAC ≤ CHF 8 **and** blended contribution/order ≥ CHF 5 **and** ≥10% of the week-1–4 cohort reordered by day 60.
- **8-week hard stop otherwise** — take the CVR/AOV learnings to SEO + partnerships and turn ads off without sentimentality.

---

## 8. Ranked risks / blind spots

1. **Repeat rate is unknown and is the entire thesis.** If buyers send one letter ever, no channel with CAC > CHF 2.30 works — instrument it before spending.
2. **Swiss Post ePost / Klara / Pingen** sell letter-sending with incumbent trust and can outrank/outbid you on "einschreiben online" forever. Differentiate on **AI drafting + correct Swiss legal form**, not postage.
3. **Template-intent contamination** — most "kündigung" searchers want a free Muster; expect bounce even with negatives. This is why C2 is a probe, not a bet.
4. **New-domain Quality Score penalty** — expect a 20–40% CPC premium for the first weeks; don't judge CPCs until QS settles.
5. **Krankenkasse season is a comparator knife-fight** (Comparis/insurers own Oct–Nov) — only qualifier long-tail is affordable; keep C5 leashed.
6. **Lease-termination seasonality** clusters at official moving dates (end Mar/Jun/Sep); August data will understate spring.
7. **Mobile payment friction** — if TWINT/Apple Pay isn't frictionless, the mobile-heavy click mix halves CVR.
8. **Tracking loss** (consent declines) makes a marginal channel look ~10–20% worse — at these margins that can flip the verdict; hence server-side purchase tracking.
9. **Support/refund cost per order** isn't in the CHF 2.20 — one support email wipes out several orders' contribution.
10. **Opportunity cost:** at this margin, CHF 1,100/month likely buys more growth in SEO content velocity, expat-forum/Reddit presence, and partnerships (relocation, moving platforms, tenant associations) than in auctions. The Ads test is justified as _data purchase_.

---

## 9. Immediate next actions (before spending a franc)

1. Ship purchase conversion tracking (contribution-valued) + Consent Mode v2 + Enhanced Conversions.
2. Ship the AOV levers: registered-default for cancellation intents, human-review add-on, 3-letter bundle.
3. Validate CPCs/volumes for the C1–C4 keyword lists in Keyword Planner (CH-only, per language).
4. Build C1–C5 (C5 paused) exactly as scoped; load negatives; set manual-CPC caps.
5. Instrument the repeat-rate cohort in the DB.
6. Launch C1–C4 at ~CHF 36/day, run the weekly negative sweep, hold structure to the week-4 / week-8 review gates.

**Bottom line:** no campaign structure fixes 6–40× arithmetic. Run the small, disciplined validation test, ship the AOV levers first, and let the repeat-rate cohort — not CAC — decide whether Google Ads is ever more than a measuring instrument for this business.
