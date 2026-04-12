# Legal Pages And Copy Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder legal pages with real English legal content, align surrounding English trust copy with the real dispatch model, and centralize brand/legal constants for later rebranding.

**Architecture:** Keep the legal routes as marketing pages, but move legal-facing constants and English legal content into focused frontend modules. Replace the placeholder legal renderer with reusable section components, then wire `/terms`, `/privacy`, and `/imprint` to structured content and update the affected English marketing and checkout copy to match the same operational truth.

**Tech Stack:** Next.js, React, TypeScript, next-intl, Vitest, server-rendered marketing pages

---

## File map

- Create: `frontend/src/lib/legal-config.ts`
- Modify: `frontend/src/components/marketing/LegalContent.tsx`
- Modify: `frontend/src/app/[locale]/terms/page.tsx`
- Modify: `frontend/src/app/[locale]/privacy/page.tsx`
- Modify: `frontend/src/app/[locale]/imprint/page.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/tests/marketing-seo.test.ts`
- Modify: `frontend/tests/checkout.test.ts`
- Create: `docs/superpowers/specs/2026-04-12-legal-pages-and-dispatch-terms-design.md`
- Create: `docs/superpowers/plans/2026-04-12-legal-pages-and-copy-alignment.md`

## Task 1: Lock legal-page behavior with failing tests

**Files:**

- Modify: `frontend/tests/marketing-seo.test.ts`
- Modify: `frontend/tests/checkout.test.ts`

- [ ] Add legal-page rendering assertions for the English timing notice, English-reference-language
      clause, Swiss Post references, and imprint operator details.
- [ ] Add a checkout assertion that the consent copy warns the user not to rely on the service for a
      deadline expiring on the day of order confirmation.
- [ ] Run:

```bash
npm test -- frontend/tests/marketing-seo.test.ts frontend/tests/checkout.test.ts
```

- [ ] Confirm failure is caused by the placeholder legal pages and old checkout copy.

## Task 2: Centralize legal-facing constants

**Files:**

- Create: `frontend/src/lib/legal-config.ts`

- [ ] Add one focused config module containing the service name, website display domain, operator
      identity details, support email, authoritative language label, and stable Swiss Post URLs.
- [ ] Keep these values isolated from unrelated metadata defaults so future brand changes touch one
      small file.

## Task 3: Replace the placeholder legal renderer

**Files:**

- Modify: `frontend/src/components/marketing/LegalContent.tsx`

- [ ] Replace the placeholder grid with reusable legal page primitives for:
  - callout/notice blocks
  - section wrappers
  - compact bullet lists
  - definition/value rows for imprint details
- [ ] Keep the component set small and mobile-readable.

## Task 4: Implement the terms page

**Files:**

- Modify: `frontend/src/app/[locale]/terms/page.tsx`
- Modify: `frontend/src/components/marketing/LegalContent.tsx`
- Create or use: `frontend/src/lib/legal-config.ts`

- [ ] Replace the placeholder page body with concise English terms reflecting the approved design.
- [ ] Include the practical notice about:
  - no same-day deadline reliance
  - at least one day, at the earliest, before printing and handover
  - no responsibility for postal execution after Swiss Post takeover
- [ ] Include Swiss Post reference links via the centralized config.

## Task 5: Implement the privacy and imprint pages

**Files:**

- Modify: `frontend/src/app/[locale]/privacy/page.tsx`
- Modify: `frontend/src/app/[locale]/imprint/page.tsx`
- Create or use: `frontend/src/lib/legal-config.ts`

- [ ] Replace privacy placeholders with concise English privacy content aligned to actual product
      behavior.
- [ ] Keep the address-autocomplete disclosure.
- [ ] Replace imprint placeholders with real operator details from the centralized config.
- [ ] Add the English-authoritative note on non-English legal routes.

## Task 6: Align the surrounding English copy

**Files:**

- Modify: `frontend/src/messages/en-CH.json`

- [ ] Tighten homepage and how-it-works dispatch wording so it no longer suggests immediate or
      operator-controlled printing and delivery.
- [ ] Update help FAQ answers about timing, tracking, and provider responsibility.
- [ ] Update checkout consent wording to mirror the terms posture in concise form.
- [ ] Avoid new hardcoded brand references in the touched English copy.

## Task 7: Verify and review

**Files:**

- Modify: `frontend/tests/marketing-seo.test.ts`
- Modify: `frontend/tests/checkout.test.ts`

- [ ] Run:

```bash
npm test -- frontend/tests/marketing-seo.test.ts frontend/tests/checkout.test.ts
```

- [ ] Review the changed pages for consistency with the design:
  - timing language
  - liability cap language
  - English reference-language clause
  - Swiss Post handover boundary
- [ ] If time permits, run one broader frontend test command covering the affected legal and
      marketing route tests.
