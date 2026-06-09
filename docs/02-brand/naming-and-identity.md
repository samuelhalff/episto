# Naming and Identity

**Status:** Locked for implementation.  
**Last updated:** 2026-03-16

This document is the current naming source of truth for implementation and launch preparation.
Do not use placeholder product names in docs, code, UI copy, email templates, or operational
configuration.

## Locked identity

- Product name: **Episto**
- Primary public domain: **`episto.ch`**
- API routing: same-host `/api` path (no separate API subdomain)
- Transactional email addresses:
  - `contact@episto.ch`
  - `contact@episto.ch`
- Internal codename: **`helvetipost`** for internal-only references that must not appear in
  user-facing surfaces

## Implementation rule

- Use `Episto` in all user-facing strings and documentation unless a route or system contract
  requires a localized translation of the name, which is not currently planned.
- Use `episto.ch` in public URL examples. The API is served from the same host under `/api`.
- Do not keep parallel placeholder variants such as `[ProductName]` or `[domain]` in live specs.
- Do not re-open naming exploration inside implementation docs.

## Remaining launch checks

The following are still real launch gates, but they do not reopen the implementation name:

- Trademark review and legal clearance
- Domain-control verification and registrar hygiene
- Final wordmark and logo asset package
- Final brand-kit exports for web, email, and app icons

## Brand posture

Episto should read as:

- trustworthy without sounding bureaucratic
- precise without sounding legalistic
- modern without startup hype
- calm under stress
- clearly built for Switzerland without imitating official institutions

## Voice guardrails

- Prefer direct, plain language.
- Do not use fear, pressure, or fake urgency.
- Do not imply legal advice, guaranteed delivery, or hidden authority.
- Do not use placeholder-brand copy in mocks, screenshots, or example strings.

## Logo direction

Until final assets are delivered:

- use a clean wordmark reading `Episto`
- pair it with a simple envelope/letter symbol only if the symbol is already production-grade
- avoid Swiss-cross branding, clip-art envelope illustrations, or decorative effects
