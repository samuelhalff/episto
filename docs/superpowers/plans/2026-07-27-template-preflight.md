# Making a template worth clicking

**Status:** implemented (rev 2 plan; P1–P6 shipped in `59a0745` + `b1623ec`) ·
**Date:** 2026-07-27

## The complaint

> "Clicking on a template just adds one sentence to the prompt textarea… is that
> really the best you can do to provide more template context?"

## What actually happens today (verified in code)

1. `/vorlagen/<slug>` CTA → `/draft/new?template=<slug>`
   (`vorlagen/[slug]/page.tsx:84`).
2. `draft/new/page.tsx:160` resolves `DRAFT_STARTERS[slug][locale]` — one generic
   first-person sentence; `:162` builds `TemplateContext { slug, checklist,
considerations }` from the landing page's SEO content.
3. **Two branches**, not one:
   - no recoverable draft → auto-creates and `router.replace`s to `/draft/<id>`
     (`:256`);
   - recoverable draft exists → renders a resume / start-fresh decision screen
     (`:319`). **"Continue draft" silently discards the template**; only
     "Start fresh" carries it (`:446`).
4. In the workspace, `IntakeStep` hydrates the starter into the composer textarea as
   editable text (`IntakeStep.tsx:109`). `templateContext` has **no display
   consumer** — zero matches across `src/components`.
5. Backend `template-guidance.ts` sanitizes the context into a prompt block framed as
   "framing & completeness only — NOT facts about this user", and does so **on every
   turn**, for as long as the metadata is present.

So the template is a topic hint plus an invisible, persistent prompt nudge. The
user's perception — "one sentence" — is accurate about everything they can see.

## Failures, named

| #   | Failure                                                                                                                           | Evidence                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| F1  | **Invisible.** Nothing says a template is active, what it needs, or that it changed anything.                                     | no display consumer            |
| F2  | **Wrong data.** The context is recycled marketing prose.                                                                          | "the checklist trap", below    |
| F3  | **Inert by design.** Guidance may never become fact, so it cannot prefill or compute.                                             | `template-guidance.ts` framing |
| F4  | **Steering outlives its only control.** Guidance persists every turn, but any UI in the `IntakeTips` slot vanishes at first send. | `IntakeStep.tsx:154,382`       |
| F5  | **Template loss on resume.** Clicking a template with an unfinished draft open and choosing "Continue" drops it silently.         | `draft/new/page.tsx:319,446`   |

This plan fixes **F1, F2, F4, F5**. F3 stays out of scope (see Non-goals).

### The checklist trap

`checklist` looks like an input list and is not. For `wohnung-kuendigen` (fr-CH):
_"Signature de toutes les parties contractantes"_, _"Demande de confirmation écrite"_
— things **episto writes into the letter**. The codebase says so itself: the landing
UI labels this section _"Das gehört in den Brief" / "À inclure dans la lettre"_
(`landing-content.ts:77,107`). Rendering it as "what you'll need" would be a lie.

**Could `steps[1]` be parsed instead?** No. Dumping `steps[1]` across all 54
localized entries shows it is not structurally an input list: it variously contains
legal calculations (`arbeitsvertrag-kuendigen`), strategic advice
(`mahnung-schreiben`), expected remedies (`beschwerde-schreiben`), number-portability
instructions (`handyabo-kuendigen`) and plain procedural actions
(`krankenkasse-kuendigen`). Only a minority are input lists. Prose-parsing three
languages needs brittle heuristics plus manual exceptions — more fragile _and_ more
work than authoring the field.

**Decision: author a new `prepare` field.** This is a content cost, not architecture.

## Rejected: a pre-flight card on `/draft/new`

The external review's first recommendation. **Rejected**, and the review agreed on
re-examination: that route has no reliable pre-flight moment, and a dedicated gate
would add friction to the highest-intent path in the product. The workspace panel
already provides a _non-blocking_ pause beside a usable composer — the pause is not
being discarded, just not made mandatory.

## Placement

Two surfaces, because one is not enough (F4):

- **Preparation panel** — replaces `IntakeTips` on the empty intake screen. Rich:
  template name, `prepare` list, attachment nudge, reassurance, controls.
- **Persistent chip** — survives after the panel goes, for as long as guidance is
  active. Minimal: template name + control. Without this, a user who notices the
  wrong template after their first message can neither see nor stop it.

## User stories

**US-1 — I can see the template took effect.**
Landing in the workspace from "Résilier son appartement", I see a chip naming that
template, so I know I am not starting from nothing.
_Accept:_ shows the template's own title; mobile + desktop; absent on cold start.

**US-2 — I know what to have to hand.**
I see 3–5 concrete things to gather (lease address, desired end date, names of all
signatories) before being asked one at a time.
_Accept:_ items are **inputs the user supplies**, never letter contents; authored per
template per locale; panel omits the list entirely when unauthored — never falls back
to `checklist`.

**US-3 — I am not blocked by not having them.**
_Accept:_ explicit reassurance line; composer always focusable and sendable; this
feature introduces no disabled state anywhere.

**US-4 — I can hand over a document instead of typing.**
_Accept:_ nudge points at the existing composer attach control; no second uploader.

**US-5 — I can stop a template that is steering me wrong.**
_Accept:_ the control is labelled for what it does — **"Turn off template guidance"**,
not "dismiss" — because backend steering, not decoration, is what stops. It clears
`templateContext` so guidance stops on the next turn, and reverts the panel to
generic tips.

**US-5a — turning it off leaves my own words alone.**
The starter is system-authored, so silently keeping it would mean guidance "off"
while a template-specific instruction still goes to the model.
_Accept:_ if the composer text is **byte-identical** to that template's starter, clear
it too; if the user edited it at all, preserve it verbatim. State which happened.

**US-5b — turning it off actually sticks.**
_Accept:_ survives reload and a concurrent intake autosave; the mutation cannot be
resurrected by a stale cache write; failure surfaces an error and leaves guidance
visibly on rather than silently half-off; the control shows a pending state.

**US-6 — the guidance gets out of my way.**
_Accept:_ the rich panel yields to the conversation at first send (existing
`hasConversationActivity`); the chip remains.

**US-7 — I can always tell what is steering my draft.**
For as long as template guidance reaches the model, I can see which template and turn
it off — not only before my first message.
_Accept:_ chip visible in the workspace whenever `templateContext` is present.

**US-8 — a wrong or unavailable template never shows me broken content.**
Landing content exists only in de/fr/it-CH, and metadata is client-writable.
_Accept:_ the panel renders only when the slug validates against the known
draft-template list **and** resolves in the active locale; on a locale switch to
en-CH it disappears rather than showing stale copy.

**US-9 — choosing a template while I have an unfinished draft is not silently lost.**
_Accept:_ entering with `?template=` and choosing "Continue draft" either applies the
template to the resumed draft or tells me it was not applied — it must not vanish
without a trace.

## Security posture (corrected)

The earlier draft claimed the card was "injection-proof". Too broad. Correctly:

- What is guaranteed: **display-copy injection resistance.** Copy is looked up from a
  trusted static registry by slug and escaped by React; no string from metadata is
  ever rendered.
- What is **not** guaranteed: `TemplateContextSchema` accepts `slug: z.string()
.max(80)` plus arbitrary string arrays (`shared/src/workspace-draft.ts:30`).
  Rewriting only the slug yields **UI template B with AI guidance from template A**.
  The harm is mis-steering, not code execution — and it can happen accidentally via
  a stale write, not just maliciously.
- **Cheap hardening included here:** constrain `slug` to the known draft-template
  list at the schema boundary. Arbitrary slugs stop being representable.
- **Deferred:** reconstructing _both_ display and AI guidance from a single validated
  server-owned slug, which removes the mismatch class entirely. Noted as the next
  step, not done here.
- Copy must not assert facts about the user or state legal conclusions. "Have to
  hand", never "your notice period is…". No deadlines (F3).

### Bundle constraint

`IntakeStep` is a **client** component. Importing `landing-content.ts` there would
pull all three large landing datasets (`de.ts` alone is >1200 lines) into the
workspace bundle. The panel therefore reads from a **small dedicated intake registry**
containing only `{ title, prepare }` per slug per locale — not the landing content.

## Content model

```ts
/** Inputs the USER should have to hand — distinct from `checklist`, which is what
 *  the finished letter must contain. 3-5 short noun phrases. Draft templates only. */
prepare?: string[];
```

Authored for all **16 draft-template slugs × de/fr/it-CH**. The review argued for
shipping the top templates first; rejected here, because the complaint that started
this work was about _inconsistency_ — a card that is rich on 6 templates and bare on
10 reproduces exactly that. The optional type and safe fallback stay regardless, as
defence, not as a shipping strategy.

A byte-equality "prepare ≠ checklist" test is weak (wrong content is rarely
byte-identical), so it is a tripwire, not the safeguard. The safeguard is editorial
review of all 48 sets.

## Phases

- **P1** ✅ content: author `prepare` 16 × 3; coverage test (3–5 items per template
  per landing locale), duplication tripwire, deadline-word guard.
- **P2** ✅ registry: `lib/template-intake/` (`{ title, prepare }` per slug per
  locale); test asserts `IntakeStep` does not import landing content.
- **P3** ✅ schema: `TemplateContext.slug` constrained to `DRAFT_TEMPLATE_SLUGS`;
  drift guard ties it to the landing routes; `isDraftTemplateSlug` narrows to it.
- **P4** ✅ UI: `TemplateGuidance.tsx` (preparation panel + persistent chip);
  i18n in all four message files.
- **P5** ✅ turn-off: flush-then-clear against post-flush cache metadata; starter
  cleared only when byte-identical **in any locale** (a draft can be seeded
  before a language switch); error + pending states.
- **P6** ✅ resume branch: `resumeDraft` applies the template and says so (US-9).
- **P7** review (codex) + full frontend suite + prod verify.

### Deviation from the plan

The panel does not take a `fallback` prop as first sketched; `IntakeGuidanceSlot`
owns the whole empty-composer slot instead (panel / turn-off confirmation /
generic tips), which keeps `IntakeStep` under the 500-line file-size guard.

## Non-goals

Typed slots, a fact lifecycle (`candidate|confirmed|evidenced`), attachment
extraction, computed legal deadlines and countdowns, `workflowId` replacing the SEO
slug as the durable key, and moving AI guidance to a server-owned registry. All are
the right next steps; none are this change. Deadlines especially — Art. 74 SchKG's
ten days run from _service of the payment order_, not from draft creation, and a
confident countdown is a liability before inputs and applicability are confirmed.
