# AI Provider and Prompt Architecture

**Status:** Canonical implementation direction for AI drafting. Exact LLM vendor remains open.
**See also:** [`letter-generation.md`](letter-generation.md), [`content-moderation.md`](content-moderation.md), [`../05-architecture/system-contracts.md`](../05-architecture/system-contracts.md), [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md)

---

## Objective

Define the production AI architecture without pretending the provider decision is already made.

---

## Locked truths

- AI drafting is a **core product path**, but **manual drafting remains first-class**.
- The backend owns all prompts, provider calls, retries, logging, and normalization.
- The frontend never calls an AI provider directly.
- Prompts must operate on canonical draft/session data, not ad hoc frontend shapes.
- The system must never invent facts, addresses, legal citations, tracking facts, or provider outcomes.
- A production launch that sends real customer content to an AI provider is blocked until the provider choice and data-processing review are approved.

---

## Open decision boundary

The exact LLM vendor and exact model IDs are still open.

Until that is resolved:

- build against an `AIProviderAdapter` interface
- keep provider-specific SDK code isolated
- keep model names in config, not in business logic
- do not write product or privacy copy that names a provider as final

This document intentionally does **not** recommend a launch vendor. That recommendation belongs in a decision record once the provider and data-processing posture are approved.

---

## Canonical pipeline

Every AI-assisted drafting request follows the same stages:

1. Intent and risk classification
2. Structured field extraction into canonical draft fields
3. Missing-field detection
4. Follow-up question generation
5. Draft generation into the controlled letter template
6. Post-generation validation and moderation check
7. User review and manual editing before any payment or dispatch step

No stage may silently skip required data or promote a partial draft into a dispatchable state.

---

## Adapter boundary

The adapter contract is stable even while the provider is open.

```ts
interface AIProviderAdapter {
  classifyIntent(input: ClassificationInput): Promise<ClassificationResult>;
  extractFields(input: ExtractionInput): Promise<ExtractionResult>;
  askFollowUp(input: FollowUpInput): Promise<FollowUpResult>;
  draftLetter(input: DraftInput): AsyncIterable<string>;
  reviseLetter(input: RevisionInput): AsyncIterable<string>;
  validateOutput(input: ValidationInput): Promise<ValidationResult>;
}
```

Rules:

- inputs and outputs come from `shared/` schemas
- no raw provider payload leaves the adapter
- provider errors map to canonical app errors
- streaming surfaces token chunks only after backend validation of request state

---

## Prompt ownership

Prompts are backend-owned assets, versioned in source control.

Required prompt families:

- `classify-intent`
- `extract-fields`
- `ask-follow-up`
- `draft-letter`
- `revise-letter`
- `validate-output`

Prompt rules:

- include only the minimum user data required for that stage
- explicitly forbid invention of facts not present in user input or canonical fields
- keep locale explicit on every call
- keep product-policy instructions in prompts, not in frontend copy
- version prompts so regressions can be traced

Do not store prompts inline in UI code or spread prompt fragments across feature modules.

---

## Data processing truth

Real user content sent to the AI path may include:

- names
- postal addresses
- factual dispute descriptions
- dates
- payment or contract context entered by the user

Therefore:

- data minimization is required at every prompt stage
- attachment file contents are not sent to the model for MVP
- rendered PDFs are not sent to the model for MVP
- logs and error tracking must not capture prompt bodies or model outputs by default

If support needs visibility into an AI incident, use internal metadata and controlled manual access, not broad logging.

---

## Streaming truth

Draft generation and revision may stream to the frontend over the backend SSE channel defined in the architecture docs. Streaming does not change the source of truth:

- the backend remains responsible for provider interaction
- partial text is not dispatchable
- a dropped stream must not create a false-success state

If streaming fails, manual editing remains available.

---

## Safety and moderation

The AI layer and moderation layer work together:

- pre-generation classification routes blocked content away from generation
- generation prompts enforce the allowed/blocked policy
- post-generation validation checks for policy violations and output drift

MVP does not require a separate third-party moderation API. If that changes later, it must be added as an explicit new dependency and decision.

---

## Failure handling

When the AI path fails:

- never block the user from manual drafting
- never expose raw provider names or payloads in user copy
- never preserve a partial stream as a completed draft
- always log the failure as metadata with a traceable request ID

Typical recoverable failures:

- provider unavailable
- timeout
- rate limit
- validation refusal
- safety refusal

All user-facing wording must map to canonical error families in
[`../05-architecture/error-taxonomy.md`](../05-architecture/error-taxonomy.md).

---

## Testing requirements

- contract tests for every adapter method
- prompt regression tests against canonical inputs and outputs
- moderation tests for blocked categories
- multilingual tests across `de-CH`, `fr-CH`, `it-CH`, `en-CH`
- tests proving that null or missing fields stay null until supplied by the user

Test doubles are allowed in automated tests. No fake provider path may appear in production configuration or live customer flows.

---

## Still open

| Decision | Status |
|---|---|
| Exact AI provider vendor | Open |
| Exact production model IDs | Open |
| Provider-specific retry/backoff tuning | Open |
| Prompt-storage path and versioning convention | Open but implementation-ready |
| Whether a secondary moderation vendor is ever needed | Post-MVP unless explicitly approved |
