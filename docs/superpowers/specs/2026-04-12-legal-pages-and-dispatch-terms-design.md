# Legal Pages And Dispatch Terms Refresh — Design

**Status:** Approved for implementation
**Date:** 2026-04-12

## Problem

The public legal pages are still placeholders, while the live product copy around dispatch timing is
too soft for a service that depends on Swiss Post after provider handover. The current site leaves
too much room for a dangerous misunderstanding: a user may think an order confirmed on the website
can still help meet a deadline expiring that same day.

That is not acceptable. The product must state clearly, consistently, and in professional Swiss-law
style language that:

- order confirmation is not the same as physical handover to Swiss Post
- at least one day is required, at the earliest, for the PDF to be printed and handed over to Swiss
  Post delivery services
- the service is not suitable for a deadline expiring on the day the order is confirmed
- once Swiss Post or its downstream process has taken over, actual printing, transport, tracking,
  returns, and delivery are outside the service operator's control

## Goals

- Replace the placeholder `/terms`, `/privacy`, and `/imprint` pages with real English legal
  content.
- Make English the authoritative legal language and state that translations are for convenience
  only.
- Keep the legal drafting concise, commercially clear, and aligned with Swiss-law logic.
- Limit the service operator's liability, to the extent permitted by law, to the amount charged for
  the relevant service.
- Align surrounding English trust copy so the public funnel no longer overstates speed or
  operational control.
- Centralize brand- and legal-reference values so the current service name and legal links are easy
  to change later.

## Non-goals

- Do not produce legally reviewed German, French, or Italian translations in this pass.
- Do not change payment, dispatch, or provider state-machine behavior.
- Do not change site-wide public-domain configuration or marketing SEO host settings as part of this
  pass.
- Do not invent Swiss-law article numbers, Swiss Post product guarantees, or provider capabilities
  that are not already confirmed.

## Approved legal posture

### 1. Contracting party and service model

- The user contracts with **West Bay SA**.
- The service is a software-enabled letter-preparation and dispatch-submission service.
- The service does not itself operate a print house, transport network, or delivery service.

### 2. Dispatch timing and deadline rule

The terms and aligned copy must state plainly that:

- website confirmation is not same-day postal handover
- at least one day is required, at the earliest, before the PDF can be printed and handed over to
  Swiss Post delivery services
- the service must not be relied on to meet a deadline that expires on the same day the order is
  confirmed on the website
- any delivery estimate after handover is indicative only

This is the most important commercial and legal clarification in the entire pass.

### 3. Provider responsibility split

- The operator is responsible for the product flow up to provider submission and handover.
- Swiss Post / ePost and any downstream production or delivery subcontractors are responsible for
  printing, enveloping, transport, delivery attempts, tracking events, return handling, and other
  postal execution after takeover.
- The terms must refer users to the current Swiss Post terms and service descriptions for matters
  outside the operator's direct control.

### 4. Liability

- Liability is capped, to the extent permitted by Swiss law, at the amount charged for the relevant
  service.
- No exclusion may purport to exclude liability where mandatory law forbids it.
- The copy should avoid aggressive or overbroad disclaimer language that would read as unfair in a
  Swiss consumer context.

### 5. Language hierarchy

- English is the authoritative version.
- Any future translations are convenience translations only.
- In case of inconsistency, the English version prevails for interpretation.

## Content architecture

### `/terms`

The live terms page must replace the placeholder grid with concise sections covering:

1. operator, scope, and contract counterparty
2. service description and order flow
3. user duties: content, authority, addresses, legality
4. dispatch timing and no same-day-deadline rule
5. Swiss Post / third-party provider role and handover boundary
6. prices, payment, refunds, and cancellation boundary
7. limitation of liability
8. privacy cross-reference
9. governing law, jurisdiction, changes, and reference language

The page should begin with a prominent practical notice summarizing the timing and handover limits.

### `/privacy`

The privacy page must stay shorter than the terms and cover:

- controller identity
- categories of personal data processed
- purposes of processing
- service providers / recipients
- retention summary
- user rights and contact
- address autocomplete disclosure
- note that Swiss Post's own privacy information also applies to its processing where relevant

### `/imprint`

The imprint must include:

- service name from a shared brand value
- operator: West Bay SA
- postal address
- support email
- website/domain display value from a shared constant
- UID / VAT number

## Brand and link strategy

### 1. Centralized legal config

Create a focused frontend legal-config module for:

- service name
- reference website/domain display value
- operator identity details
- support email
- Swiss Post reference URLs
- reference language label

This module should be the only place touched when the legal-facing brand or legal links change.

### 2. Stable Swiss Post references

Do not link to hashed Swiss Post media PDFs in page copy.

Use stable public references instead, such as:

- Swiss Post GTC hub: `https://www.swisspost.ch/gtc`
- Swiss Post letter-layout instructions: `https://www.swisspost.ch/layout-of-letters`
- Swiss Post privacy/legal hub: `https://www.post.ch/en/pages/footer/data-protection-and-disclaimer`
- Swiss Post registered-mail overview where relevant: `https://www.post.ch/en/registered`

## Locale behavior for this pass

- The legal pages may keep localized metadata and navigation chrome.
- The legal body itself is English-only in this pass.
- Non-English legal routes must display a clear note that the page is shown in English because the
  English version is currently the authoritative legal text.

## Copy alignment scope

The following English copy must be updated to match the legal posture:

- homepage / marketing "send" and dispatch language
- how-it-works delivery wording
- help FAQ answers about timing, dispatch, tracking, and responsibility
- checkout legal-consent wording

The rewritten copy must stop implying same-day handling or direct operator control over printing and
delivery after handover.

## Implementation notes

- Replace the placeholder-only legal-page component with reusable legal layout primitives.
- Keep the pages readable on mobile, with short sections, strong headings, and restrained visual
  emphasis.
- Start implementation with tests that lock the new legal-page content and the updated checkout/help
  wording before changing production code.
