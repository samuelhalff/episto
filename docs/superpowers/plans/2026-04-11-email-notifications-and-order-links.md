# Email Notifications and Order Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overlapping post-payment email flow with truthful dispatch-status emails, keep Stripe as the payment receipt sender, and move customer order links to signed tokens that later dispatch emails can issue safely.

**Architecture:** Add a signed order-access-token helper under `orders`, teach checkout to keep Stripe receipt details in sync on both create and reuse, extract one shared dispatch-email context builder, then remove the obsolete `dispatch-confirmation` path from payment and worker flows. Keep legacy hash-based order links readable in `order.routes.ts` so old emails do not break while new emails use signed `/status/:orderToken` links. Work directly on `main` per repo instructions; do not create a worktree or branch for this repo.

**Tech Stack:** TypeScript, Fastify, Drizzle ORM, BullMQ, jose, Stripe SDK, Vitest, Next.js, next-intl

---

## File Structure

> This document was split into linked parts to keep repository markdown files within the documented size limits.

## Parts

1. [Part 1 — New files to Task 2: Resolve signed order tokens in order routes while keeping legacy links alive](2026-04-11-email-notifications-and-order-links-part-01.md)
2. [Part 2 — Task 3: Keep Stripe receipt details in sync on create and reuse](2026-04-11-email-notifications-and-order-links-part-02.md)
3. [Part 3 — Task 4: Build one shared dispatch email context and remove the old confirmation template to Task 5: Rewire notification ownership to dispatch state transitions](2026-04-11-email-notifications-and-order-links-part-03.md)
4. [Part 4 — Task 6: Align frontend receipt copy and canonical docs to Task 7: Verify the integrated behavior](2026-04-11-email-notifications-and-order-links-part-04.md)

Former in-file section anchors now live inside the linked part files above.
