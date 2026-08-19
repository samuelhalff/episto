# Attachment Reading and Drafting Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uploaded documents reliably available to first-letter drafting, including scanned PDFs and images when OCR is configured, while preventing premature drafting and unsafe document instructions from influencing the assistant.

**Architecture:** Keep object storage and background ingestion as the source of truth. Text-layer PDFs use local extraction; scans and images use Azure Document Intelligence with existing page and session budgets. The attachment step will not advance while reading is in progress, and the AI prompt will treat extracted content as candidate user facts that remain subject to review and confirmation.

**Tech Stack:** Fastify, Drizzle/Postgres, S3-compatible storage, `unpdf`, Azure Document Intelligence, Next.js/React, Vitest, Docker Compose production deployment.

---

### Task 1: Lock the user-visible readiness contract

**Files:**

- Modify: `frontend/src/hooks/use-draft-files.ts`
- Modify: `frontend/src/components/product/draft-flow/AttachmentsStep.tsx`
- Test: `frontend/tests/attachment-extraction.test.ts`

- [x] Add a derived `isExtracting` state for active attachment rows with `pending` or `ocr_running` status.
- [x] Prevent the attachment step from advancing while extraction is in progress, while allowing terminal states such as `no_ocr` to continue with their existing explanation.
- [x] Add regression coverage for pending OCR blocking progression and terminal unreadable statuses not blocking progression.

### Task 2: Make attachment facts explicitly reviewable and safe

**Files:**

- Modify: `backend/src/modules/files/attachment-ingestion.service.ts`
- Modify: `backend/src/modules/ai/prompts/intake.ts`
- Modify: `backend/src/modules/ai/prompts/drafting.ts`
- Test: `backend/tests/attachment-ingestion.test.ts`
- Test: `backend/tests/ai-prompt-injection.test.ts`

- [x] Frame extracted attachment text as candidate reference facts, not instructions or silently verified legal truth.
- [x] Preserve marker defanging, filename sanitization, total injection caps, and the rule that unreadable files are named and never guessed.
- [x] Require the assistant to use readable document facts for drafting but call out ambiguity or consequential facts for user verification in the normal review flow.
- [x] Test the prompt contract and injection defenses.

### Task 3: Promote production OCR configuration safely

**Files:**

- Modify: `.env.production` (ignored operational configuration only; do not commit secrets)
- Modify: `scripts/deploy.sh`
- Test: shell/config validation during deployment

- [x] Provision the existing Document Intelligence endpoint and key from the local configured environment without printing secret values.
- [x] Make deployment fail early if OCR variables are absent, because scans/photos otherwise deterministically become `no_ocr`.
- [x] Deploy with the protected remote env file and verify the backend container receives both variables.

### Task 4: Verify and deploy

**Files:**

- No source changes.

- [x] Run focused backend/frontend tests, typechecks, scoped lint/format checks, and production build.
- [x] Build and ship production images through `scripts/deploy.sh`.
- [x] Verify service health and backend OCR configuration presence without exposing document contents or secrets. A live user upload was not performed because no test document/session was authorized.
