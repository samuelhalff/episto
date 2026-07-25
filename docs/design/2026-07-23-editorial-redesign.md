# episto redesign — from "AI-generated" to crafted

Direction from a codex-sol design audit of the live site (2026-07-23). Goal:
make episto look human-designed and Swiss-editorial, not template-generated.
Guiding idea: **stop representing correspondence with generic design metaphors —
show correspondence itself.** Work in verifiable stages; screenshot before/after
each (build into `.next-verify`, run the standalone server, `tmp/shoot.mjs`).

## The AI tells to remove

Radial-gradient warm background; the tilted fake "M. Keller" letter specimen with
a script signature; pill navigation + light/dark segmented pills; yellow
rounded-square logo (app-icon look); giant yellow CTA billboards; six-card
template grid; rounded "Kurz erklärt" prose cards; ambient soft shadows on normal
UI; blanket 16/24/40px radii; an uppercase eyebrow above nearly every heading;
whitespace used to manufacture prestige; duplicate footer controls.

## Stages

1. **Typography** — Source Serif 4 (headings/leads), Source Sans 3 (body/UI),
   IBM Plex Mono (postal metadata only). Apply the scale (H1 56/58, H2 36/40,
   lead 20/30, body 17/27, meta 12/16 0.06em). Reserve uppercase eyebrows for
   document categories + operational metadata only.
2. **Colour + surface** — 4 neutrals: paper `#F5F2EA`, document white `#FFFFFF`,
   ink `#161616`, secondary ink `#5D5A54`, rule `#D7D2C8`; action yellow
   `#F6C54A` on ≤10% of a page. Remove the gradient background and ambient
   shadows on nav/panels/footer; shadows only on photographed/rendered paper.
3. **Radius + buttons** — 4px radius. Primary = yellow/black label 44–48px;
   secondary = transparent + 1px black border; links look like links.
4. **Components** — plain hairline header (no capsule, no theme toggle on
   marketing); template links as a numbered index (rows + hairlines, not cards);
   process steps with a black top rule + tabular numerals (no yellow rail);
   three panel types only (plain+top-rule / important with 4px yellow left
   border / real artifact with shadow). Ruled footer, no floating tray.
5. **Signature device** — a "dispatch docket" in IBM Plex Mono (AUFGABE /
   VERSANDART / SEITEN / STATUS) with thin rules + one yellow status marker.
   Real workflow data in-product; clearly-labelled `MUSTER` samples on marketing.
6. **Page structures** — template page as an 8/4 article with a sticky
   "Brief erstellen" module; pricing page as a tariff (breakdown table, tabular
   numerals) not a SaaS widget.
7. **Imagery** — replace the fake letter with a real photographed episto letter +
   window envelope + registered receipt (needs a tabletop shoot). Interim: a flat,
   straight, rendered typeset document marked `MUSTER` — no grey placeholder bars.

## References to steal from (codex sol)

Swiss Post / SBB (colour discipline + real artifacts), Stripe pre-2020 (type +
restraint), Postmark/Basecamp (plain honest components), a tariff sheet (pricing).

## Status

- [ ] 1 Typography · [ ] 2 Colour · [ ] 3 Radius/buttons · [ ] 4 Components
- [ ] 5 Dispatch docket · [ ] 6 Page structures · [ ] 7 Photography (needs owner)
