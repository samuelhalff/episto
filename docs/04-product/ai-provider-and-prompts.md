# AI Provider and Prompt Architecture

**Status:** Canonical implementation direction for AI drafting. Azure provider path is locked.
**See also:** [`letter-generation.md`](letter-generation.md), [`content-moderation.md`](content-moderation.md), [`../05-architecture/system-contracts.md`](../05-architecture/system-contracts.md), [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md)

---

## Objective

Define the production AI architecture with the Azure provider decision locked while keeping
deployment names and model config environment-driven.

---

## Locked truths

- AI drafting is a **core product path**, but **manual drafting remains first-class**.
- The backend owns all prompts, provider calls, retries, logging, and normalization.
- The frontend never calls an AI provider directly.
- Prompts must operate on canonical draft/session data, not ad hoc frontend shapes.
- The system must never invent facts, addresses, legal citations, tracking facts, or provider outcomes.
- Real customer AI traffic must go only through the locked Azure provider path and approved Azure account/subscription flow.

---

## Locked provider boundary

The AI vendor choice is locked to Azure-hosted model APIs.

Implementation still keeps the deployment details configurable:

- build against an `AIProviderAdapter` interface
- keep Azure-specific SDK/client code isolated
- keep deployment names and model IDs in config, not in business logic
- keep product and privacy docs truthful about Azure without inventing region or residency claims

Locked default deployment pair:

- `gpt-4.1` for drafting and revision
- `gpt-4.1-mini` for classification, extraction, and follow-up generation

Adapter/module convention:

- `ai/adapters/azure-openai.ts`
- default env keys: `AI_PROVIDER_MODE=azure_openai`, `AZURE_OPENAI_ENDPOINT`,
  `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AI_DRAFT_MODEL`, `AI_CLASSIFY_MODEL`
- optional agent env keys for Azure AI Project agent execution:
  `AI_PROVIDER_MODE=azure_ai_project_agent`, `AZURE_AI_PROJECT_ENDPOINT`,
  and either `AZURE_EXISTING_AGENT_ID=<agent-name>:<version>` or
  `AZURE_AI_AGENT_NAME` + `AZURE_AI_AGENT_VERSION`
- auth for Azure AI Project agent execution must still remain inside approved Azure identity flows
  (for example Entra ID via `DefaultAzureCredential`, Azure CLI, managed identity, or service principal
  env vars). Do not move AI auth to the frontend.

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

Implementation note:

- stages 1-4 may be satisfied by one backend-owned structured intake-analysis call as long as the
  returned payload still contains separate classification, extraction, readiness, and follow-up
  outputs
- this is the preferred production path because it reduces provider round-trips and repeated context
  transmission without changing the logical pipeline
- draft and revision generation may co-generate a proposed subject in the same response envelope;
  post-generation validation remains a separate stage

---

## Adapter boundary

The adapter contract stays stable even though the exact Azure deployment names remain configurable.

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
- agent-backed execution must still preserve backend-owned prompts, normalization, and error mapping;
  the agent is an Azure execution path, not a frontend-owned behavior change

---

## Provider conversation persistence

When the Azure execution path uses provider-side threads or conversations, Episto still owns the
canonical drafting state.

Rules:

- draft fields and persisted conversation messages remain the primary source of truth
- provider conversation/thread IDs may be stored with the draft/session as resumable execution state
- provider retention metadata must be tracked alongside that ID
- if the provider thread has expired, rebuild remote context from canonical app state instead of
  pretending the remote thread still exists
- do not ask redundant questions if the answer is already present in canonical draft fields or prior
  persisted messages
- do not wipe a valid draft only because a provider-side thread expired; start a fresh provider
  thread and continue from app-owned context

---

## Prompt ownership

Prompts are backend-owned assets, versioned in source control.

Required prompt families:

- `analyze-intake` (preferred production prompt; combines classification, extraction, missing-field detection, and follow-up generation)
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

### Locale & Legal Safety

- **Locale enforcement:** Every prompt must explicitly state the target locale (e.g., "Output strictly in standard Swiss German (Hochdeutsch)").
- **Dialect rule:** Never generate Swiss German dialect (Mundart) for formal letters.
- **Legal hallucination:** Instruct the model to _never_ invent Article numbers or specific laws. If a user asks for "legal backing", the model must refuse or use generic phrasing ("under applicable Swiss law") rather than fabricating a statute.

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

Provider-thread loss is treated the same way: preserve app-owned state, recreate remote execution
context if needed, and keep manual editing available.

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

## Still configurable

| Decision                                             | Status                                                    |
| ---------------------------------------------------- | --------------------------------------------------------- |
| Exact Azure region / deployment names                | Config-driven                                             |
| Exact production model IDs                           | Config-driven (defaults locked, deployments configurable) |
| Provider-specific retry/backoff tuning               | Open                                                      |
| Prompt-storage path and versioning convention        | Open but implementation-ready                             |
| Whether a secondary moderation vendor is ever needed | Post-MVP unless explicitly approved                       |

## Azure deployment checklist

Before enabling real customer traffic on the Azure path, verify:

1. The chosen Azure region actually exposes `gpt-4.1` and `gpt-4.1-mini`
2. The deployment names in `AI_DRAFT_MODEL` and `AI_CLASSIFY_MODEL` resolve correctly
3. Streaming behavior works with the backend SSE contract
4. Content-filter behavior does not silently break the drafting/refinement UX
5. Quota and rate limits are sufficient for expected launch traffic
6. Prompt/body logging is disabled or redacted in all observability paths
7. Timeout, retry, and fallback rules are tested for both drafting and extraction flows

Do not treat model availability in one Azure region or tenant as proof that it exists everywhere.
