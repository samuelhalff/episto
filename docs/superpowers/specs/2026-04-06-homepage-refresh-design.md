# Homepage refresh design

**Date:** 2026-04-06  
**Status:** Approved for planning  
**Scope:** Homepage refresh plus reusable SEO improvements for current marketing pages

## Problem

The current homepage implementation feels too compact and generic for Swiss Mail's brand:

- trust and feature icons are cramped, overly literal, and visually weak
- section spacing is inconsistent, with one-off padding values that make the page rhythm feel uneven
- the final CTA band uses an amber/orange treatment that does not match the primary yellow action family
- the page explains the flow, but it does not build enough calm confidence through structure, proof, and content hierarchy
- marketing routes appear to rely too heavily on root metadata instead of page-specific SEO structure

This refresh should make the homepage feel more premium, more trustworthy, and more discoverable without turning Swiss Mail into a generic AI landing page.

## Goals

1. Make the homepage feel like a premium Swiss service rather than a lightweight startup page.
2. Standardize visual rhythm so sections feel deliberate and industry-standard, not oversized or cramped.
3. Replace weak icon treatments with a consistent, padded icon system.
4. Rebuild the final CTA band around the primary yellow family.
5. Improve homepage and marketing-page SEO through stronger content structure, metadata, and internal linking.

## Non-goals

1. No full content-marketing or blog rollout.
2. No keyword stuffing or hype-heavy AI copy.
3. No new provider claims, logos, or trust statements that are not already supported by project docs.
4. No redesign of product app routes, draft flows, or admin surfaces.

## Design direction

The approved direction is a **Swiss-trust refresh**: calm, premium, and trust-first.

It draws from a mix of:

- **Mercury / DocuSign** for calm authority, restrained layouts, and premium service positioning
- **Stripe** for section rhythm and clearer page flow
- **PandaDoc / Notion** for cleaner card systems and clearer value storytelling

The page should feel formal, modern, and reassuring. It should not feel playful, noisy, or over-animated.

## Page structure

The refreshed homepage should follow this order:

1. **Hero**
2. **Trust strip**
3. **How it works**
4. **Confidence / value block**
5. **Use cases**
6. **Final CTA**

This keeps the page shorter and more focused than the full long-form marketing blueprint while still adding the missing trust and explanation layer between "how it works" and "use cases."

## Visual system

### Section rhythm

Most homepage content sections should standardize to:

- **mobile:** `py-16`
- **desktop:** `py-24`

Supporting rhythm should be shared instead of hand-tuned per section:

- section intro spacing: `mb-8 md:mb-12`
- grid gaps: `gap-4 md:gap-6`
- card padding: `p-5 md:p-7` unless a component has a stronger existing reason

The goal is to remove current outliers where spacing expands or compresses without a clear reason.

### Icon system

All trust and feature icons should use one shared treatment:

- Lucide only
- padded icon token, roughly **48px container**
- **20-24px icon** inside the token
- consistent optical centering and breathing room
- shared neutral or softly tinted token backgrounds (`primary-light`, `accent-light`, or equivalent muted surface)

Avoid icons that feel like generic clipart shorthand. Prefer icons that communicate product meaning and trust calmly.

### CTA color hierarchy

The final CTA band should move to the **primary yellow family**, with dark text and a cleaner premium treatment.

It should feel like a high-confidence final action block, not a warm promotional banner. Secondary actions remain neutral.

## Section details

### 1. Hero

Replace the current centered hero with a **split hero**:

- left: headline, supporting copy, CTA row, quiet proof line
- right: real product proof, such as a polished product panel or letter/drafting preview

Requirements:

- one strong H1
- copy focused on the outcome: serious letters, properly structured, ready for postal dispatch in Switzerland
- primary CTA goes to `/draft/new`
- secondary action should support understanding or buying confidence, not act as another vague detour

This section should feel more premium and grounded than the current centered stack.

### 2. Trust strip

Move trust cues out of the boxed mini-card cluster and into a cleaner horizontal band immediately below the hero.

Requirements:

- shorter, clearer trust labels
- smaller but better-padded icon tokens
- calmer, more deliberate spacing
- no cramped stacking effect

This section should reassure quickly without dominating the page.

### 3. How it works

Keep the 3-step structure, but make it feel more premium:

- larger icon containers
- clearer step numbering
- more even card heights
- simpler, more cohesive visual treatment

The three steps remain the core flow explanation, but the section should look more trustworthy and less generic.

### 4. Confidence / value block

Add a dedicated value block after "How it works."

Purpose:

- explain why Swiss Mail is better than doing this manually
- build trust through clarity, not hype
- bridge the gap between process explanation and use-case browsing

Likely themes:

1. professionally structured letters
2. privacy-conscious, review-first workflow
3. no-account-required convenience

This is the biggest structural addition in the refresh and the main "high-trust SaaS" pattern currently missing from the homepage.

### 5. Use cases

Keep the use-case grid, but make it calmer and more useful:

- reduce visual gimmicks
- improve spacing and hierarchy
- add short supporting text beneath each item
- make the cards better internal-linking assets for future SEO work

The use-case section should feel informative and purposeful, not decorative.

### 6. Final CTA

Rebuild the bottom CTA around:

- primary yellow background treatment
- dark headline and supporting text
- one strong CTA
- one concise proof or pricing-related support line

The final CTA should feel premium and decisive.

## SEO and content architecture

### Metadata model

Current marketing pages should not depend mainly on shared root metadata.

Introduce reusable marketing-page SEO handling so the homepage and current marketing routes can each define:

- locale-aware title
- locale-aware meta description
- canonical URL
- hreflang alternates
- page-appropriate Open Graph fields

App, draft, and admin routes remain out of search results.

### Homepage SEO shape

The homepage should do more semantic work:

- one clear H1
- stronger H2/H3 structure
- more explicit explanatory copy around real user intent
- less vague SaaS phrasing

Copy should stay calm and premium, but it should be more legible to both users and search engines.

### Internal linking

The homepage should link more deliberately into current marketing pages such as pricing and help, and it should leave room for future use-case route linking.

Anchor text should be clearer and more descriptive than generic navigation-style wording.

### Structured data

Where content supports it, add the schema already called for by docs:

- homepage: `Organization`, `WebSite`, and homepage/service schema as appropriate
- pricing/help and other current marketing pages: page-appropriate structured data only when the content truthfully supports it

No fabricated claims or schema fields.

### SEO scope guardrail

This pass covers:

- homepage content and structure improvements
- reusable SEO improvements for current marketing pages

This pass does **not** cover:

- blog strategy
- large-scale keyword landing-page expansion
- full content-program production

## Implementation surfaces

Likely files and components affected during planning and implementation:

- `frontend/src/app/[locale]/page.tsx`
- `frontend/src/components/marketing/primitives.tsx`
- `frontend/src/components/marketing/FinalCTABand.tsx`
- marketing layout and metadata surfaces under `frontend/src/app/`
- locale message files for any changed marketing copy

Implementation should prefer extracting reusable marketing primitives rather than hard-coding one-off homepage-only styles where clear patterns can be shared.

## Success criteria

The refresh is successful when:

1. the homepage feels more premium and trust-first at a glance
2. icon treatments are visually consistent and no longer cramped
3. section spacing follows one predictable rhythm
4. the final CTA band clearly belongs to the Swiss Mail brand palette
5. homepage and current marketing pages have stronger SEO structure without falling into keyword-stuffed copy

