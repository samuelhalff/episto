# Letter Locale Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make supported letter-locale changes update the whole draft surface, and make unsupported language requests produce a clear assistant response without mutating the draft.

**Architecture:** `draft.locale` remains the canonical locale. Shared API validation, draft services, AI field extraction, and AI revision/generation all use that same field; preview and rendering already derive subject framing, salutation, closing, dates, and HTML language from it.

**Tech Stack:** TypeScript, Zod, Fastify, Drizzle, Vitest, React Query, Next.js.

---

## File Structure

- Modify `shared/src/contracts/index.ts`: add `locale` to `UpdateDraftInput`.
- Modify `backend/src/modules/drafting/draft.service.ts`: persist locale through PATCH.
- Modify `backend/src/modules/ai/prompts/intake.ts`: teach intake JSON contract to return supported `locale` and unsupported locale requests.
- Modify `backend/src/modules/ai/ai.service.ts`: normalize intake analysis locale fields.
- Modify `backend/src/modules/ai/draft-context.ts`: allow AI field updates to write `locale`.
- Modify `backend/src/modules/ai/ai.handler.ts`: reject unsupported locale requests before intake/revision generation.
- Modify `backend/src/modules/ai/ai.streaming.ts`: pass effective locale to draft/revision prompts and validation.
- Modify `backend/tests/ai-prompts.test.ts`: prompt contract coverage.
- Modify `backend/tests/ai-handler.test.ts`: supported and unsupported locale behavior.
- Modify `shared/tests/contracts.test.ts`: PATCH locale validation.
- Modify `frontend/tests/use-draft-stream.test.ts`: SSE locale field coverage.

## Task 1: Shared Manual Locale Updates

**Files:**

- Modify: `shared/src/contracts/index.ts`
- Modify: `backend/src/modules/drafting/draft.service.ts`
- Test: `shared/tests/contracts.test.ts`

- [ ] **Step 1: Write the failing shared contract test**

Add assertions that `UpdateDraftInput` accepts `fr-CH` and rejects an unsupported locale:

```ts
expect(UpdateDraftInput.parse({ locale: "fr-CH" }).locale).toBe("fr-CH");
expect(() => UpdateDraftInput.parse({ locale: "es-ES" })).toThrow();
```

- [ ] **Step 2: Run the shared contract test**

Run: `npm test --workspace shared -- contracts.test.ts`

Expected: FAIL because `locale` is stripped or missing from the parsed update.

- [ ] **Step 3: Add locale to the shared update schema**

In `shared/src/contracts/index.ts`, add:

```ts
locale: LocaleSchema.optional(),
```

to `UpdateDraftInput`.

- [ ] **Step 4: Persist locale in draft updates**

In `backend/src/modules/drafting/draft.service.ts`, add `locale?: string | undefined` to the update input type and:

```ts
if (updates.locale !== undefined) values.locale = updates.locale;
```

- [ ] **Step 5: Run contract tests**

Run: `npm test --workspace shared -- contracts.test.ts`

Expected: PASS.

## Task 2: Prompt Locale Detection Contract

**Files:**

- Modify: `backend/src/modules/ai/prompts/intake.ts`
- Modify: `backend/src/modules/ai/ai.service.ts`
- Test: `backend/tests/ai-prompts.test.ts`

- [ ] **Step 1: Write the failing prompt test**

Assert the intake prompt lists `locale`, supported locale values, and `unsupportedLocaleRequest` in the JSON contract.

- [ ] **Step 2: Run the prompt test**

Run: `npm test --workspace backend -- ai-prompts.test.ts`

Expected: FAIL because the prompt does not mention locale extraction.

- [ ] **Step 3: Update the intake prompt contract**

Add `locale` and `unsupportedLocaleRequest` to the fields contract. Add rules:

```text
- If the user asks to write, translate, or switch the letter to German, French, Italian, or English, extract locale as de-CH, fr-CH, it-CH, or en-CH.
- If the user asks for any other language, set unsupportedLocaleRequest to the requested language name and do not set locale.
```

- [ ] **Step 4: Normalize intake analysis locale fields**

In `ai.service.ts`, ensure `fields.locale` survives only when it is one of the four supported locales. Ensure `fields.unsupportedLocaleRequest` survives only as a non-empty string.

- [ ] **Step 5: Run prompt tests**

Run: `npm test --workspace backend -- ai-prompts.test.ts`

Expected: PASS.

## Task 3: AI Locale Field Mutation and Unsupported Request Handling

**Files:**

- Modify: `backend/src/modules/ai/draft-context.ts`
- Modify: `backend/src/modules/ai/ai.handler.ts`
- Test: `backend/tests/ai-handler.test.ts`

- [ ] **Step 1: Write failing unsupported-locale handler test**

Set `analyzeIntake` to return `fields: { unsupportedLocaleRequest: "Spanish" }`. Assert `createMessage` emits supported-locale guidance, `mockDb.set` is not called with `locale`, and `draftLetter` is not called.

- [ ] **Step 2: Write failing supported-locale intake test**

Set `analyzeIntake` to return `fields: { locale: "fr-CH" }`. Assert `mockDb.set` is called with `locale: "fr-CH"` and SSE events include a `field_update` for `locale`.

- [ ] **Step 3: Run handler tests**

Run: `npm test --workspace backend -- ai-handler.test.ts`

Expected: FAIL because `locale` is not AI-updatable and unsupported locale requests are ignored.

- [ ] **Step 4: Allow AI locale field updates**

Add `"locale"` to `DRAFT_FIELD_COLUMNS` in `draft-context.ts`.

- [ ] **Step 5: Add unsupported locale helper**

In `ai.handler.ts`, add a small helper that reads `analysis.fields.unsupportedLocaleRequest`, emits a message listing German, French, Italian, and English for Switzerland, and returns before draft generation.

- [ ] **Step 6: Run handler tests**

Run: `npm test --workspace backend -- ai-handler.test.ts`

Expected: PASS.

## Task 4: Revision Uses Requested Locale

**Files:**

- Modify: `backend/src/modules/ai/ai.handler.ts`
- Modify: `backend/src/modules/ai/ai.streaming.ts`
- Test: `backend/tests/ai-handler.test.ts`

- [ ] **Step 1: Write failing revision locale-change test**

For a draft with an existing German body, send `"Translate the whole letter to French"`. Mock the language detector path to use `fr-CH`, mock `reviseLetter`, and assert `reviseLetter` receives `locale: "fr-CH"` and `mockDb.set` includes `locale: "fr-CH"`, translated subject, body, and metadata.

- [ ] **Step 2: Run handler tests**

Run: `npm test --workspace backend -- ai-handler.test.ts`

Expected: FAIL because revision currently bypasses intake and always uses `draft.locale`.

- [ ] **Step 3: Detect locale requests before revision**

Before `streamRevision`, run intake analysis for the latest user message only enough to detect `locale` or `unsupportedLocaleRequest`. If unsupported, emit the excluded-locale message and return. If supported, pass the effective locale to revision and persist it with the revision result.

- [ ] **Step 4: Update stream revision signature**

Change `streamRevision` to accept an optional `effectiveLocale`, use it for prompts and validation, and include `locale` in `updateFields` when it differs from `draft.locale`.

- [ ] **Step 5: Run handler tests**

Run: `npm test --workspace backend -- ai-handler.test.ts`

Expected: PASS.

## Task 5: Frontend SSE Locale Cache Coverage

**Files:**

- Test: `frontend/tests/use-draft-stream.test.ts`

- [ ] **Step 1: Add locale SSE fanout assertion**

Extend the field update test to emit:

```ts
getActiveEventSource()?.emit("field_update", {
  field: "locale",
  value: "fr-CH",
  updatedAt: "2026-04-07T00:00:01.000Z",
});
```

Assert subscribers receive the `locale` field event.

- [ ] **Step 2: Run frontend hook test**

Run: `npm test --workspace frontend -- use-draft-stream.test.ts`

Expected: PASS because field names are generic; this guards the live update path.

## Task 6: Full Verification

**Files:**

- All changed files.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test --workspace shared -- contracts.test.ts
npm test --workspace backend -- ai-prompts.test.ts ai-handler.test.ts
npm test --workspace frontend -- use-draft-stream.test.ts
```

Expected: all targeted tests PASS.

- [ ] **Step 2: Run status and review changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: only locale-hook implementation files are changed.
