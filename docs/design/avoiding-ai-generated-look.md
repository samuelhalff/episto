# Avoiding the "AI-Generated Look" in Tailwind — episto Design Guardrails

Research deliverable for the two design-research tasks. Part 1 catalogs the visual "tells"
that make a Tailwind UI read as AI-generated; Part 2 gives the techniques that make it read
as bespoke/human. Both are grounded in **episto's actual frontend** (Tailwind v3.4,
`frontend/tailwind.config.ts`, `frontend/src/app/globals.css`, `frontend/src/components/ui/`).

## TL;DR for episto

episto is **already mostly clear** of the AI-look. It uses a custom warm amber palette
(`#f6c54a`), semantic design tokens (`shadow-subtle/elevated/prominent`), a real component
library, no emoji, and asymmetric hero layouts. The **one real tell** is uniform
corner-rounding overuse (`rounded-2xl` ×102, `rounded-3xl` ×26). Fix that and hold the line
with the checklist below; do **not** re-introduce generic patterns.

---

## Part 1 — The tells that scream "AI generated"

| #   | Tell                                                                                     | Why it reads as AI                                                | episto status                                          |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | **Default indigo/violet/blue palette** (`bg-indigo-600`, `from-purple-500`)              | The model's default "nice" color. Every scaffold looks identical. | ✅ Clear — custom amber, 0 indigo/violet               |
| 2   | **Everything `rounded-2xl`/`rounded-3xl`**                                               | No radius hierarchy; pill-ifies every surface indiscriminately    | ⚠️ **Present** — 102 + 26 uses, uniform                |
| 3   | **`shadow-lg`/`shadow-xl`/`shadow-2xl` on every card**                                   | Uniform heavy elevation, no depth logic                           | ✅ Clear — semantic tokens, `shadow-sm` default        |
| 4   | **Generic gradients** `bg-gradient-to-r from-X-500 to-Y-600`                             | Decorative gradient with no brand meaning                         | ✅ Clear — 0 generic `-500→-600` chains                |
| 5   | **Emoji in headings/CTAs** (🚀 ✨ 📝)                                                    | Filler personality; unprofessional for trust-sensitive product    | ✅ Clear — 0 emoji, all i18n copy                      |
| 6   | **Symmetric 3-card feature grid** mapped over a `features[]` array with an icon + h3 + p | The canonical LLM "features section"                              | ✅ Mostly clear — grids vary 2/3 by content            |
| 7   | **Centered-everything hero** with a big gradient blob behind centered text               | Default hero; no layout tension                                   | ✅ Clear — asymmetric 2-col hero                       |
| 8   | **Default type scale only** (`text-sm/base/lg/xl`) with system font                      | No typographic voice                                              | ◑ Partial — custom Inter + tracking, but default scale |
| 9   | **`backdrop-blur` everywhere** for "glassmorphism"                                       | Trend-chasing, low contrast                                       | ✅ Clear — 8 strategic uses only                       |
| 10  | **Perfectly even spacing** (same `gap-6`/`p-6` on every block)                           | No rhythm or grouping                                             | ◑ Watch — audit for monotony                           |
| 11  | **Lorem/placeholder-ish generic copy** ("Empower your workflow")                         | No product specificity                                            | ✅ Clear — concrete Swiss-mail copy                    |
| 12  | **One-off utility soup** repeated inline instead of primitives                           | No system; copy-paste drift                                       | ✅ Clear — real `components/ui/` library               |

**How to detect on any repo (grep):**

```bash
grep -rEo 'indigo-[0-9]+|violet-[0-9]+|purple-[0-9]+' src | sort | uniq -c   # default palette
grep -rEo 'rounded-(2xl|3xl)' src | wc -l                                    # radius overuse
grep -rEo 'shadow-(lg|xl|2xl)' src | wc -l                                   # elevation spam
grep -rEo 'from-[a-z]+-500 to-[a-z]+-600' src                                # generic gradients
grep -rP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' src                        # emoji in JSX
```

---

## Part 2 — Techniques that make Tailwind look bespoke/human

1. **Design tokens, not raw utilities.** Define brand color, radius, shadow, and spacing in
   `tailwind.config.ts` / CSS variables and reference _semantic_ names. episto already does this
   (`--action-primary-bg`, `shadow-prominent-warm`). Keep new work on tokens; never hardcode a
   new hex or a `shadow-xl` inline.
2. **A radius _scale_, used with intent.** Human designs use 2–3 radii deliberately: small for
   inputs/badges (`rounded-lg`), medium for cards (`rounded-2xl`), large only for hero/marketing
   surfaces (`rounded-3xl`/`4xl`). The tell is using the _same_ large radius on everything. See
   the episto refactor recommendation below.
3. **Restrained, layered elevation.** One or two shadows total. Elevation should signal
   interactivity/z-order, not decoration. episto's `subtle → elevated → prominent` ladder is the
   right model.
4. **Typographic voice.** Pair a display treatment (tight tracking, larger optical sizes) against
   a comfortable body measure (`max-w-[65ch]`), rather than default `text-lg` everywhere. episto
   uses Inter + `tracking-[-0.05em]` on headings and an Allura script accent — extend this with a
   deliberate step scale (e.g. custom `fontSize` tokens) for a stronger voice.
5. **Intentional asymmetry & rhythm.** Vary column ratios (episto's
   `lg:grid-cols-[1.05fr_0.95fr]` hero is exemplary), group related blocks with tighter spacing
   and separate sections with larger, and avoid identical `gap`/`p` on every element.
6. **Content-driven layout.** Let real content (4 use cases, 3 steps) drive grid counts instead
   of forcing a symmetric 3-up. episto's `UseCaseGrid` (2-col) + `HowItWorksSteps` (3-col) is
   correct.
7. **Component primitives over inline soup.** Encapsulate `Button`, `Card`, `Input`, `Badge` so
   variants are named and consistent. episto's `components/ui/` + `.btn-*`/`.card-surface`
   component classes are the right pattern — route all new surfaces through them.
8. **Motion with purpose.** Subtle, physical, few. episto's custom `rise-in`/`glow-pulse`
   keyframes beat generic `animate-bounce`; keep motion tied to entrance/state, honor
   `prefers-reduced-motion`.
9. **Real, specific copy.** Concrete, product-true language (episto: Swiss postal delivery,
   registered mail, no account) instantly de-genericizes a UI.

---

## episto-specific recommendations (prioritized)

| Priority          | Recommendation                                                                                                                                                                                                                                                                   | Evidence                              | Risk                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| **Do now (safe)** | Introduce radius hierarchy: reserve `rounded-3xl/4xl` for marketing/hero surfaces, standardize interactive elements (inputs, buttons, list rows, badges) on `rounded-lg`/`rounded-xl`. Audit the 128 `rounded-2xl/3xl` sites and step them down where they're small/interactive. | `rounded-2xl` ×102, `rounded-3xl` ×26 | Low — visual only, do incrementally per component |
| Consider          | Add a small custom `fontSize`/`lineHeight` token scale for display headings instead of default `text-4xl/5xl`, to strengthen typographic voice.                                                                                                                                  | Default type scale (tell #8)          | Low                                               |
| Watch             | Audit spacing for monotony — vary section vs intra-section gaps.                                                                                                                                                                                                                 | Tell #10                              | Low                                               |
| Hold              | No change needed to palette, shadows, gradients, hero layout, component library — these are already bespoke.                                                                                                                                                                     | —                                     | —                                                 |

**Guardrail for future work / AI-assisted edits:** before merging frontend changes, run the
detection greps above. Any new `indigo/violet/purple`, generic `-500→-600` gradient, `shadow-xl`,
emoji in copy, or blanket `rounded-3xl` is a regression toward the AI-generated look and should be
rewritten onto episto's existing tokens.
