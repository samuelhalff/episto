# Global consistency + templates — pattern-based plan (2026-07-27)

Owner asked: don't fix single items — understand the _pattern_ behind each, sweep
the whole app for every instance, fix comprehensively, and make the app
consistent (templates / shortcuts / components / dialog placement + size, desktop

- mobile). Below: each pattern, every instance found in the audit, the fix.
  codex (gpt-5.6-sol) reviewed the templates/added-value/SEO cluster.

---

## Pattern 1 — Two disconnected "start a letter" models, and clicking a template adds nothing

**Root cause.** Marketing has 15 landing templates (`src/lib/landing/*`); the in-app
quick-start has 4 generic shortcuts mapped to `?useCase=` → one of 4 canned prompts
(`draft/new/page.tsx:114`). They're unrelated taxonomies, and every template CTA
links to **bare `/draft/new`** (`vorlagen/[slug]/page.tsx:120,168`) — no context,
so the assistant gets none of the page's Swiss expertise.

**Instances.** All 15 landing pages; the quick-start overlay ("Des façons de démarrer
plus vite"); `draft/new` useCase seeding.

**Fix (codex commits 1–3, 5):**

- **One catalog of letter types** powering BOTH the landing templates AND the in-app
  shortcuts (single source of truth: slug → localized starter + critical intake
  questions + checklist + Swiss notes).
- **`?template=<slug>`** on every draftable-page CTA → central resolver prefills the
  intake input (editable), and persists `{slug, locale, intent, checklist, swiss
considerations}` in draft metadata.
- Backend **explicitly extracts + sanitizes** that context (never a raw dump) and uses
  it for intent classification / next-missing-question / completeness — **never as
  user-supplied facts** (template gives framing/questions, not invented specifics).
- Shortcuts become the top N catalog entries → templates and shortcuts finally match.
- Prompt tests: lease template asks for the contractual term (doesn't invent it);
  health-insurance distinguishes basic vs supplementary.

## Pattern 2 — Taxonomy contains non-templates

**Root cause.** "Envoi" entries `einschreiben-online`, `brief-online-versenden`
describe the _service_, not a letter you draft; `brief-an-behoerde` is generic.

**Fix (codex commit 1).** Add a page **type** (`draft_template` | `service_guide`).
Service guides: excluded from the template hub + popular templates + shortcuts; their
CTA points to how-it-works/pricing, not a seeded draft. Keep URLs (SEO), no migration.

## Pattern 3 — Misused `·` "middot" as a list separator (reads like a list when it isn't)

**Instances found (audit).**

- `hero.proof` = "No account needed · Exact total before payment · Your details stay
  private" — 3 value props strung as a fake list. **← the reported one; genuine misuse.**
- `LetterSpecimen` HERO_CAPTION "Registered letter · cancellation example".
- Legit metadata separators (KEEP): `files.summary`, `signature.uploadHint`,
  AttachmentUploader ext·size, PricingSimulator, HeroPrice, admin dashboard/search.

**Fix.** Trust proof → three items with subtle check icons (not dot-joined). Review the
specimen caption. Leave true inline metadata separators (they're conventional).

## Pattern 4 — Inconsistent dialog/modal placement + sizing

**Root cause.** `ui/dialog` `DialogContent` base is a full-screen bottom-sheet; every
consumer overrides differently — promo uses centered `app-panel max-w-sm/md`; the
quick-start overlay is a small centered box; Feedback/Confirm/BodyGeneration each roll
their own. No single standard → the "small centered popup" complaint.

**Instances.** `promo-form-dialog`, `promos/page` delete dialog, `FeedbackDialog`,
`ConfirmDialog`, `BodyGenerationDialog`, the draft quick-start overlay.

**Fix.** Define ONE modal standard in `ui/dialog`: responsive shell = **centered card on
desktop, bottom sheet on mobile**, standard max-widths (sm/md/lg), padding, scroll,
close affordance. Migrate all dialogs to it. Consistent on both breakpoints.

## Pattern 5 — Bland/"sad" template presentation

**Fix.** After Pattern 1/2, redesign the hub + popular templates as richer cards
(category, title, one-line value, a small letter motif), consistent with the editorial
system — but only for real `draft_template` types.

## Pattern 6 — SEO/GEO correctness (codex C / commit 4)

- Length cleanup: 6 FR + 12 IT titles exceed 60 chars after `| episto`; 5 descriptions
  exceed 160 (service ones reach 179–187). Shorten keyword-first.
- Schema by page type: Article/WebPage + CollectionPage/ItemList; Service schema only on
  service guides; visible sources + author/publisher + review dates. HowTo/FAQ only as
  honest semantic markup (rich results deprecated/restricted).
- Internal linking with intent (generic↔specific, related-vs-sending), official sources.
- No magic "GEO schema" — win via concise Swiss-scoped answers + primary sources +
  authorship + stable URLs.

## Pattern 7 — Evidence-based content gaps (codex commit 5)

Add, individually, with sources + deadline cautions + intake tests + analytics:

1. Rental defect notice · 2. Payment-order opposition (Rechtsvorschlag) · 3.
   Employment-certificate request/correction. Track slug → CTA → draft → checkout.

---

## Execution order (phased)

- **P1 (highest value):** Pattern 1 + 2 — taxonomy types + `?template=` seeding +
  backend context + shortcuts↔templates unification. This is the owner's angriest point.
- **P2:** Pattern 4 — one dialog standard, migrate all modals (desktop+mobile).
- **P3:** Pattern 3 + 5 — `·`/trust-strip + richer template cards.
- **P4:** Pattern 6 — SEO/GEO cleanup + truthful schema.
- **P5:** Pattern 7 — new templates, evidence-tracked.

Each phase = small commits, tests, deploy. Full codex critique archived in this session.
