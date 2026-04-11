# Signature Canvas Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing typed-only + image-upload signature system with a clean two-mode signature: typed (Allura cursive font) and drawn (on-screen canvas via `react-signature-canvas`). The drawn signature is exported as a trimmed PNG and uploaded through the existing file-asset pipeline.

**Architecture:** Signature stays inside the Logistics step (no new route step). The `signatureMode` enum gains a `"drawn"` value. Drawn signatures flow through the existing file-asset upload pipeline (`kind: "signature"`) — canvas exports a trimmed PNG blob, uploads it, and the draft stores `signatureAssetId`. The backend PDF renderer embeds drawn-signature PNGs as base64 `<img>` tags. The frontend LetterPreview renders the asset image for drawn mode instead of Allura text.

**Tech Stack:** `react-signature-canvas` (wraps `signature_pad`), existing file-asset upload pipeline, Puppeteer PDF renderer, Next.js + Tailwind frontend.

---

> This document was split into linked parts to keep repository markdown files within the documented size limits.

## Parts

1. [Part 1 — File Structure to Task 4: Build SignatureCanvas component](2026-04-10-signature-canvas-redesign-part-01.md)
2. [Part 2 — Task 5: Build SignatureSection component to Task 7: Update LetterPreview to render drawn signatures](2026-04-10-signature-canvas-redesign-part-02.md)
3. [Part 3 — Task 8: Update backend PDF renderer for drawn signatures to Task 12: Full verification](2026-04-10-signature-canvas-redesign-part-03.md)

Former in-file section anchors now live inside the linked part files above.
