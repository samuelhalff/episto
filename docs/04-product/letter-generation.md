# Letter Generation

> Cross-reference: [`ai-provider-and-prompts.md`](ai-provider-and-prompts.md) for model selection, prompt
> construction, and provider adapter boundaries.

## Objective

Define a generation pipeline that is useful but predictable. The model must not jump directly from
messy user input to dispatchable output without structure.

## Generation pipeline

Steps execute in order. No step may be skipped.

1. **Classify intent and risk** — identify the purpose of the letter and flag any content that
   requires extra care (legal claims, threatening language, misrepresentation risk)
2. **Extract structured fields** — transform raw user input into the canonical schema (see below)
3. **Identify missing required data** — surface gaps before drafting, not after
4. **Ask targeted follow-up questions** — one primary gap at a time, with tightly coupled
   structured inputs grouped only when that is clearly lower-friction than splitting them; see
   `ai-provider-and-prompts.md` for follow-up prompt templates
5. **Generate draft from structured data** — model writes into the controlled template; no freeform
   layout invention
6. **Validate output against layout and policy rules** — see `document-template.md` for layout
   constraints
7. **Require user review before dispatch** — AI output is never automatically dispatchable

## Canonical structured fields

| Field                 | Required | Notes                                                                                     |
| --------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `sender`              | Yes      | Full name and address                                                                     |
| `recipient`           | Yes      | Full name and address                                                                     |
| `subject`             | Yes      | Max 200 characters                                                                        |
| `body`                | Yes      | Max 10,000 characters                                                                     |
| `factualClaims`       | —        | **Not built.** See below                                                                  |
| `requestedOutcome`    | —        | **Not built.** Partly covered by `intent`; see below                                      |
| `tone`                | Yes      | formal / neutral / firm — matches `ai/prompts/intake.ts`, which never had a "semi-formal" |
| `deliveryType`        | Yes      | standard / registered                                                                     |
| `signatureMode`       | Yes      | typed / image                                                                             |
| `attachmentsMetadata` | Optional | File references, not embedded content                                                     |

**`factualClaims` and `requestedOutcome` do not exist, as of 2026-07-28** — not in
`DraftLetterSchema` (`shared/src/schemas/index.ts`), not in the `draft_letters` table
(`backend/src/db/schema/drafting.ts`), not under any other name.

The concepts are handled, just not as columns. The drafting prompt is told to "use facts ONLY
from the user's input" and the intake prompt chases "the specific action the recipient should
take", but both consume that material into prose: the asserted facts and the requested outcome
end up inside `body` and `metadata.aiDocument`, alongside the conversation history that produced
them. `intent` stores only the category of request (complaint, cancellation, demand, …), not the
outcome itself — "refund CHF 500 by 15 December" is a sentence in the letter, not a field.

That is a real limitation and it is worth naming: because the claims are never extracted, nothing
can show the user a list of "facts this letter asserts on your behalf" before they pay to send it,
and nothing can diff those claims against the attached documents they came from. Adding the two
columns alone would not buy that — it needs an extraction step, a review surface, and a decision
about what happens when the user edits the body afterwards and the extracted claims go stale. Until
that is designed, the honest statement is that the fields are unbuilt, not that they are optional.

## Model responsibilities

- Turn messy language into structured fields
- Propose clean, formal wording
- Highlight missing information explicitly
- Preserve user-stated facts unless the user changes them
- Keep tone calm and formal unless the user requests otherwise

## Model non-responsibilities

- Deciding dispatch success
- Inventing addresses, provider references, or postal capabilities
- Deciding retention policy
- Determining legal validity of claims
- Silently selecting an unsupported provider feature

## Generation constraints

- Output must target the single controlled letter template (see `document-template.md`)
- No arbitrary formatting or layout invention
- No hidden policy bypasses
- No unsupported claims such as "legally valid" or "proof of delivery guaranteed"

## Review rule

AI output is always a suggestion layer.

Dispatchable output exists only after all of the following are true:

- Schema passes validation
- Required fields are present and non-empty
- User has reviewed the final draft
- Payment requirements are satisfied
- Provider requirements are satisfied

## Provider model note

The specific AI model used, prompt construction details, temperature settings, and provider adapter
boundaries are maintained in [`ai-provider-and-prompts.md`](ai-provider-and-prompts.md). Changes to
model behavior must be documented there, not here.
