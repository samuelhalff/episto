# SEO Strategy — Episto

**Status:** MVP planning  
**Scope:** Swiss market, multilingual (de-CH, fr-CH, it-CH, en-CH)  
**Stack context:** Next.js (SSR/SSG capable)

---

## 1. SEO Philosophy

**Content-led, not keyword-stuffed.**  
Ranking comes from genuinely useful pages that serve real Swiss user intent — not from cramming keywords into thin copy.

**Swiss-market first.**  
Local trust signals matter in Switzerland. Domain choice, hosting location, language authenticity, and brand tone all carry weight alongside technical factors.

**Multilingual SEO as a first-class concern.**  
Switzerland has four language communities. Each deserves its own properly localised landing experience — not a machine-translated clone. `hreflang` implementation must be correct from day one.

**Performance is a ranking signal.**  
Core Web Vitals directly affect search rankings. Next.js SSR/SSG gives us the structural capability; the team must not let runtime bloat undermine it.

**Capability stays in the background.**  
The product's positioning is calm, trustworthy, Swiss-style simplicity. Follow the Google Maps
rule: describe the result, not the machinery. SEO copy should not lead with AI claims, badges, or
gimmicky automation language.

---

## 2. Technical SEO Checklist

### Rendering strategy

- [ ] All marketing pages, landing pages, and use-case pages use **SSG or SSR** (no client-side-only rendering)
- [ ] App routes (`/app/**`, `/draft/**`) explicitly `noindex` — they must never appear in search results
- [ ] Preview pages rendered server-side for sharing if supported

### HTML structure

- [ ] Semantic HTML5: `<main>`, `<article>`, `<section>`, `<nav>`, `<header>`, `<footer>`, `<aside>`
- [ ] Single `<h1>` per page; logical heading hierarchy (h2 → h3 → h4)
- [ ] Descriptive `alt` text on all meaningful images; empty `alt=""` on decorative images

### Meta tags

Template per page type:

| Page type    | Title pattern                               | Description length |
| ------------ | ------------------------------------------- | ------------------ |
| Homepage     | `Episto — Briefe online versenden, Schweiz` | 140–155 chars      |
| Use-case LP  | `{UseCase} per Post — {ProductName}`        | 140–155 chars      |
| How it works | `Wie es funktioniert — {ProductName}`       | 140–155 chars      |
| Pricing      | `Preise — {ProductName}`                    | 140–155 chars      |
| Blog post    | `{Post Title} — {ProductName} Blog`         | 140–155 chars      |

- [ ] Every page has a unique, non-truncated `<title>` and `<meta name="description">`
- [ ] No duplicate titles or descriptions across language variants

### Open Graph and Twitter Card

- [ ] `og:title`, `og:description`, `og:image` (1200×630 px), `og:url`, `og:locale`, `og:type`
- [ ] `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] Locale-specific OG images or at minimum locale-correct copy overlaid
- [ ] OG images generated statically or via `@vercel/og` — no broken image fallbacks

### Structured data (JSON-LD)

Implement on the relevant pages:

| Schema type                   | Pages                                |
| ----------------------------- | ------------------------------------ |
| `Organization`                | All pages (site-wide, in `<head>`)   |
| `Product` / `Service`         | Homepage, pricing page               |
| `HowTo`                       | How-it-works page                    |
| `FAQPage`                     | Use-case landing pages, pricing page |
| `BreadcrumbList`              | All pages with depth > 1             |
| `WebSite` with `SearchAction` | Homepage                             |

- [ ] Validate all structured data with Google's Rich Results Test before launch
- [ ] No fabricated fields — only assert facts that are actually true

### Canonical URLs

- [ ] Every page declares `<link rel="canonical" href="..." />`
- [ ] Canonical always points to the preferred language variant (not cross-language)
- [ ] Trailing slash consistency enforced across the entire site (pick one, stick to it)
- [ ] 301 redirects in place for any normalised URL variants

### XML sitemap

- [ ] Auto-generated sitemap at `/sitemap.xml` (use `next-sitemap` or equivalent)
- [ ] Includes all indexable marketing and landing pages
- [ ] Excludes: app routes, draft routes, admin routes, API routes
- [ ] `<lastmod>` populated accurately; update on content deploys
- [ ] Sitemap submitted to Google Search Console and Bing Webmaster Tools on launch

### `robots.txt`

```
User-agent: *
Allow: /

Disallow: /app/
Disallow: /draft/
Disallow: /api/
Disallow: /admin/
Disallow: /preview/

Sitemap: https://swissmail.ch/sitemap.xml
```

- [ ] Verify no accidental disallow of marketing pages before launch

### hreflang implementation

Every indexable page must declare the full set of language variants:

```html
<link rel="alternate" hreflang="de-CH" href="https://swissmail.ch/de/[slug]" />
<link rel="alternate" hreflang="fr-CH" href="https://swissmail.ch/fr/[slug]" />
<link rel="alternate" hreflang="it-CH" href="https://swissmail.ch/it/[slug]" />
<link rel="alternate" hreflang="en-CH" href="https://swissmail.ch/en/[slug]" />
<link rel="alternate" hreflang="x-default" href="https://swissmail.ch/" />
```

Rules:

- Every variant must link back to all other variants (bidirectional)
- `x-default` points to the language-selection homepage or the most common entry
- Managed centrally; never hardcoded page-by-page

### Mobile-first indexing

- [ ] Identical content on mobile and desktop (no mobile-crippled pages)
- [ ] Touch targets ≥ 48px
- [ ] No horizontal scroll on viewport widths ≥ 320px
- [ ] Fonts legible at default sizes without pinch-zoom

### Core Web Vitals targets

| Metric                                | Target            | Notes                                                       |
| ------------------------------------- | ----------------- | ----------------------------------------------------------- |
| LCP (Largest Contentful Paint)        | < 2.5s            | Hero image/text must be SSR-rendered                        |
| FID / INP (Interaction to Next Paint) | < 100ms / < 200ms | Minimise main-thread blocking JS                            |
| CLS (Cumulative Layout Shift)         | < 0.1             | Reserve space for images, fonts; avoid late-loading content |

- [ ] Measure with PageSpeed Insights on real mobile device profile before launch
- [ ] Set up continuous CWV monitoring (Search Console CWV report + synthetic testing)

### Image optimisation

- [ ] All images served in **WebP** (fallback to PNG/JPEG for older browsers via `<picture>`)
- [ ] Next.js `<Image>` component used for all product images (automatic format, sizing, lazy loading)
- [ ] `width` and `height` always specified to prevent CLS
- [ ] Hero/LCP images preloaded with `fetchpriority="high"` or `priority` prop
- [ ] Below-the-fold images lazy-loaded
- [ ] Descriptive, keyword-relevant `alt` text (not generic "image of…")

---

## 3. URL Structure

### Principles

- Language code as the first path segment (not subdomain, not query parameter)
- Slugs in the local language and script
- Short, readable, and permanent — avoid changing slugs after indexing
- No index.html, no trailing query strings in canonical URLs

### Structure map

```
/                              → Language detection / selection gateway
  /de/                         → German-language homepage
  /fr/                         → French-language homepage
  /it/                         → Italian-language homepage
  /en/                         → English-language homepage

  /de/brief-online-versenden   → Primary action landing page (de)
  /fr/envoyer-lettre-en-ligne  → Primary action landing page (fr)
  /it/inviare-lettera-online   → Primary action landing page (it)
  /en/send-letter-online       → Primary action landing page (en)

  /de/kuendigungsschreiben     → Use-case: cancellation letters (de)
  /fr/lettre-de-resiliation    → Use-case: cancellation letters (fr)
  /it/lettera-di-disdetta      → Use-case: cancellation letters (it)
  /en/cancellation-letter      → Use-case: cancellation letters (en)

  /de/wie-es-funktioniert      → How it works (de)
  /de/preise                   → Pricing (de)
  /de/blog/                    → Blog root (de) — post-MVP

  /app/**                      → NOINDEX — all app/draft routes
  /api/**                      → Not served to browsers
```

### Pattern

```
/{lang}/{keyword-slug}
```

- `{lang}`: `de` | `fr` | `it` | `en`
- `{keyword-slug}`: localised, lowercase, hyphenated, keyword-relevant

---

## 4. Target Keywords by Language

> ⚠️ **Research starting points only.** Volumes, competition, and exact match variants must be validated with keyword research tools (Ahrefs, SEMrush, Google Keyword Planner) before finalising page priorities.

### de-CH

| Keyword                             | Intent                      | Priority |
| ----------------------------------- | --------------------------- | -------- |
| Brief online versenden Schweiz      | Transactional               | High     |
| Kündigung per Post senden           | Transactional               | High     |
| Brief schreiben lassen online       | Transactional               | High     |
| Eingeschriebener Brief Schweiz      | Informational/Transactional | High     |
| Kündigungsschreiben Vorlage Schweiz | Informational               | Medium   |
| Formellen Brief schreiben           | Informational               | Medium   |
| Brief einschreiben online aufgeben  | Transactional               | Medium   |
| Mietvertrag kündigen Schweiz        | Transactional               | Medium   |

### fr-CH

| Keyword                            | Intent                      | Priority |
| ---------------------------------- | --------------------------- | -------- |
| Envoyer une lettre en ligne Suisse | Transactional               | High     |
| Résiliation par courrier Suisse    | Transactional               | High     |
| Lettre recommandée en ligne        | Transactional               | High     |
| Rédiger lettre formelle en ligne   | Transactional               | High     |
| Modèle lettre résiliation Suisse   | Informational               | Medium   |
| Envoyer courrier recommandé Suisse | Transactional               | Medium   |
| Lettre de résiliation contrat      | Informational/Transactional | Medium   |
| Courrier officiel en ligne         | Transactional               | Medium   |

### it-CH

| Keyword                              | Intent        | Priority |
| ------------------------------------ | ------------- | -------- |
| Inviare lettera online Svizzera      | Transactional | High     |
| Disdetta contratto per posta         | Transactional | High     |
| Lettera raccomandata online Svizzera | Transactional | High     |
| Scrivere lettera formale online      | Transactional | High     |
| Modello lettera disdetta Svizzera    | Informational | Medium   |
| Spedire raccomandata online          | Transactional | Medium   |
| Disdetta affitto Svizzera            | Transactional | Medium   |

### en-CH

| Keyword                             | Intent                      | Priority |
| ----------------------------------- | --------------------------- | -------- |
| Send letter online Switzerland      | Transactional               | High     |
| Mail letter online Swiss Post       | Transactional               | High     |
| Cancel contract by post Switzerland | Transactional               | High     |
| Send registered letter Switzerland  | Transactional               | High     |
| Swiss cancellation letter template  | Informational               | Medium   |
| Write formal letter Switzerland     | Informational/Transactional | Medium   |
| Online postal service Switzerland   | Transactional               | Medium   |

---

## 5. Landing Page Strategy

### Homepage (`/`)

**Purpose:** Brand introduction, trust establishment, language entry.  
**Structure:**

1. Hero with primary CTA in the detected or selected language
2. Trust signals (privacy-first, delivery-status clarity, dispatch confirmation)
3. Use-case entry cards (cancellation, formal notice, complaint, etc.)
4. How-it-works summary (3–4 steps)
5. Pricing teaser
6. FAQ (structured data)
7. Footer with language switcher

**SEO:** `Organization` + `WebSite` + `FAQPage` JSON-LD. Hreflang full set. `x-default` canonical.

### Use-case landing pages (per language)

One page per use case per language. Priority use cases for MVP:

| Use case             | de-CH slug                 | fr-CH slug                  | it-CH slug                  | en-CH slug                 |
| -------------------- | -------------------------- | --------------------------- | --------------------------- | -------------------------- |
| Cancellation letters | `/de/kuendigungsschreiben` | `/fr/lettre-de-resiliation` | `/it/lettera-di-disdetta`   | `/en/cancellation-letter`  |
| Formal notices       | `/de/formelle-mitteilung`  | `/fr/avis-formel`           | `/it/avviso-formale`        | `/en/formal-notice`        |
| Contract termination | `/de/vertragskuendigung`   | `/fr/resiliation-contrat`   | `/it/risoluzione-contratto` | `/en/contract-termination` |
| Complaints           | `/de/beschwerdebrief`      | `/fr/lettre-de-reclamation` | `/it/lettera-di-reclamo`    | `/en/complaint-letter`     |

**Each use-case page must include:**

- What the use case is and when it applies in Switzerland
- How Episto handles it (step-by-step)
- Dispatch options (standard vs registered)
- Transparent pricing
- CTA to start a draft
- FAQ section (5–8 questions) with `FAQPage` JSON-LD
- Internal links to related use cases

### How-it-works page (`/{lang}/wie-es-funktioniert` etc.)

**Structure:** Step-by-step illustrated breakdown. `HowTo` JSON-LD. Trust signals. CTA.

**SEO signal:** Targets users in the research phase who want to understand the process before committing.

### Pricing page (`/{lang}/preise` etc.)

**Structure:** Per-letter pricing, dispatch options, any subscription tiers (post-MVP). Transparent postal fee pass-through.

**SEO note:** Pricing pages can rank for comparison and cost-intent queries. Include a short FAQ about what is included.

---

## 6. Content Strategy

### MVP content requirements (before launch)

Every language must have at minimum:

- Translated homepage
- 1–2 use-case landing pages (start with cancellation letters — highest intent volume)
- How-it-works page
- Pricing page

Do not launch untranslated pages under a language prefix. Either translate fully or exclude the language variant.

### Post-MVP content expansion

**Blog / resource section (`/{lang}/blog/`)**

Purpose: long-tail keyword capture, trust building, organic acquisition.

Priority topic clusters:

| Cluster                     | Example articles                                                 |
| --------------------------- | ---------------------------------------------------------------- |
| Swiss letter-writing guides | "Wie schreibt man einen gültigen Kündigungsbrief in der Schweiz" |
| Legal context (non-advice)  | "Fristen für Vertragskündigungen in der Schweiz"                 |
| Template gallery            | "Kündigungsschreiben Vorlage — kostenlos herunterladen"          |
| How Swiss Post works        | "Einschreiben in der Schweiz — was bedeutet das genau?"          |
| Swiss tenant/landlord       | "Mietvertrag kündigen: was muss im Brief stehen?"                |

**Rules for content:**

- Every piece must serve a real search intent AND provide a clear path into the product
- No fabricated legal claims — always include a disclaimer for legal-adjacent content
- Content must be written or reviewed by a fluent native speaker of each locale
- Internal linking: each article links to the relevant use-case landing page and vice versa

**Template gallery (`/{lang}/vorlagen/` etc.)**

Landing pages for individual letter templates. Each page:

- Explains the template's purpose
- Shows a preview (non-functional, blurred if needed)
- CTAs to start a draft using that template
- Structured data: `HowTo` or `FAQPage`

---

## 7. Local SEO Signals

### Domain

- `.ch` domain strongly preferred for Swiss trust signals and local ranking
- Avoid `.com` or `.io` if a `.ch` equivalent is available
- Decision blocked on final naming — see Open Decisions

### Hosting and infrastructure

- Swiss data centre preferred for latency (affects CWV) and trust perception
- If Vercel (or similar CDN) is used, ensure Swiss edge nodes are in the serving path
- Privacy policy must accurately reflect data location and handling

### Swiss-specific structured data

- `Organization` schema must include Swiss address (once known)
- `ContactPoint` with Swiss support channel details
- `areaServed: "CH"` on `Organization` and `Service` schemas

### Google Business Profile

- Create a profile once the product has a physical or verifiable business presence in Switzerland
- Not strictly required at launch, but beneficial for branded search and trust panels

### Backlink strategy

Priority targets for Swiss backlinks:

- Swiss consumer protection organisations (e.g. Konsumentenschutz)
- Swiss legal aid resources (link-worthy if content is genuinely useful)
- Swiss startup and fintech directories
- Cantonal government resource pages (if the product solves documented citizen needs)
- Swiss media and tech blogs (earned, not paid)

> Avoid low-quality directory spam. A small number of authoritative Swiss links outperforms hundreds of generic ones.

---

## 8. Performance Budget

These are hard constraints for **marketing pages** (not app routes):

| Resource                            | Budget   |
| ----------------------------------- | -------- |
| Total JS (initial load, compressed) | < 200 KB |
| Total CSS (compressed)              | < 30 KB  |
| Total page weight (first load)      | < 500 KB |
| Time to Interactive (3G connection) | < 3s     |
| LCP                                 | < 2.5s   |
| CLS score                           | < 0.1    |

### Enforcement approach

- [ ] Measure with Lighthouse CI in the build pipeline
- [ ] Fail the build if LCP > 4s or CLS > 0.25 on key marketing pages
- [ ] Bundle analyser (`@next/bundle-analyzer`) run on every major dependency addition
- [ ] Fonts loaded with `font-display: swap`; subset to characters used
- [ ] No layout shift from: images (set dimensions), fonts (use `swap`), ads or embeds (reserve space), dynamic content injections
- [ ] Third-party scripts (analytics, chat) deferred or loaded asynchronously; never block render

---

## 9. Analytics and Tracking

### Privacy-first requirement

Switzerland has high privacy expectations. The analytics stack must be:

- GDPR-compatible (applies to Swiss businesses dealing with EU residents)
- Ideally nDSG (Swiss data protection act) aligned
- No invasive fingerprinting
- Preferably cookieless or minimal-cookie

### Recommended vendor consideration

| Vendor              | Cookieless | EU/Swiss hosted        | Notes                                       |
| ------------------- | ---------- | ---------------------- | ------------------------------------------- |
| Plausible Analytics | ✅         | ✅ (EU)                | Lightweight, no consent banner needed       |
| Fathom Analytics    | ✅         | ✅                     | Similar to Plausible                        |
| Umami (self-hosted) | ✅         | ✅ (if self-hosted CH) | Most control; ops overhead                  |
| Google Analytics 4  | ❌         | ❌                     | Consent banner required; complex compliance |

> Decision: open — see Open Decisions. Default recommendation is Plausible or equivalent privacy-first tool.

### Core metrics to track

| Metric                                    | Why                                     |
| ----------------------------------------- | --------------------------------------- |
| Organic search traffic (by language/page) | Channel quality and content performance |
| Keyword ranking positions                 | Track target keywords weekly            |
| Landing page → draft-start conversion     | SEO-to-product funnel                   |
| Draft-start → payment conversion          | Full funnel anchor                      |
| Bounce rate on use-case pages             | Content relevance signal                |
| Search Console impressions/clicks/CTR     | Organic visibility health               |

### Search Console

- [ ] Verify all language variants in Google Search Console (property per domain variant or as URL prefix)
- [ ] Submit sitemap on launch
- [ ] Monitor Core Web Vitals report weekly post-launch
- [ ] Monitor Manual Actions and Coverage reports

### Bing Webmaster Tools

- [ ] Submit sitemap
- [ ] Verify site
- [ ] Bing is a meaningful share of Swiss desktop search

---

## 10. Open Decisions

These items are **blocked** and must be resolved before full SEO implementation:

| Decision                      | Blocker                                          | Impact                                        |
| ----------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Domain name                   | Product naming decision outstanding              | All canonical URLs, hreflang, structured data |
| Analytics vendor              | Privacy/compliance review needed                 | Tracking setup, consent banner decision       |
| Exact keyword research        | Requires Ahrefs/SEMrush or equivalent            | Finalise page priorities, slug choices        |
| Blog / resource launch timing | Post-MVP; scope and resourcing remain undecided  | Long-tail acquisition                         |
| Swiss hosting confirmation    | Infrastructure decision pending                  | Local SEO trust signal, CWV                   |
| Google Business Profile       | Requires verified business address in CH         | Branded search panel                          |
| Content localisation review   | Translations must be reviewed by native speakers | Multilingual page quality                     |

---

## Appendix: Competitor reference

For positioning context only — not an authoritative analysis:

| Competitor       | Domain        | Notes                                         |
| ---------------- | ------------- | --------------------------------------------- |
| SuperPost        | superpost.com | Online letter sending, Swiss focus            |
| Pingen           | pingen.ch     | API-first postal dispatch, developer-oriented |
| Swiss Post ePost | epost.ch      | Official postal offering                      |

Episto should differentiate on: guided mobile workflow, calm consumer-first UX, and a faster
path from intent to posted letter — not purely on price or dispatch speed.
