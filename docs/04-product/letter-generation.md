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

| Field | Required | Notes |
|---|---|---|
| `sender` | Yes | Full name and address |
| `recipient` | Yes | Full name and address |
| `subject` | Yes | Max 200 characters |
| `body` | Yes | Max 10,000 characters |
| `factualClaims` | Conditional | Extracted claims the user asserts as true |
| `requestedOutcome` | Yes | What the sender wants to happen |
| `tone` | Yes | formal / semi-formal |
| `deliveryType` | Yes | standard / registered |
| `signatureMode` | Yes | typed / image |
| `attachmentsMetadata` | Optional | File references, not embedded content |

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
