# AI Implementation Rules

## Objective

Prevent AI-assisted development from inventing facts, flows, or provider behavior.
The target is a complete production-ready SaaS application, not a prototype, scaffold, or staged fake.

## Source-of-truth order

1. Official, current provider documentation
2. This repository's `docs/` directory
3. Shared contracts and schemas in `shared/`
4. Existing code

If any of these conflict, do not improvise. Raise the conflict explicitly.

The repository must be sufficient on its own. Prior chats, private notes, and remembered context
are not valid implementation inputs unless the same decision is written back into this repo.

### Within `docs/`

When multiple docs touch the same decision, use this precedence:

1. `docs/08-guardrails/open-decisions.md` for locked vs open decisions
2. Other current guardrail docs in `docs/08-guardrails/`
3. Current canonical implementation docs in `docs/03-*`, `docs/04-*`, `docs/05-*`, `docs/06-*`, `docs/07-*`
4. Orientation or strategy docs such as `README.md`, `docs/index.md`, and `docs/01-vision/*`

If a doc says it "supersedes" an earlier note, the superseding doc wins.
If a route, state, or schema appears in more than one current doc, the more concrete implementation
spec wins over the more narrative one.

## How to interpret document labels

These labels are not decorative. They change how an implementation agent should behave.

| Label | Meaning | Implementation rule |
|---|---|---|
| **Locked** | Final decision | Implement exactly as written |
| **Open** | Decision unresolved | Do not hardcode an answer; preserve the boundary |
| **Recommended** | Directional recommendation only | Do not treat as approved unless a higher-authority doc locks it |
| **Canonical / Authoritative** | Current implementation authority within that file's stated scope | Use it, but only within its scope |
| **Living document** | Expected to evolve | Useful, but subordinate to more concrete canonical docs |
| **Draft** | Partially settled material with known open questions | Use only the settled parts; keep open parts configurable or blocked |

The words "definitive", "reference", or "canonical" do not create cross-domain authority. A mobile
doc does not outrank a route spec on route behavior. A brand doc does not outrank a system contract
on state.

## Task-routing protocol

Before implementation, classify the task and read the required docs for that concern. Do not read
one convenient file and assume the rest.

| Task type | Required docs before coding |
|---|---|
| Route or screen implementation | `08-guardrails/open-decisions.md`, `03-ux/user-flows.md`, `03-ux/page-specifications.md`, `03-ux/component-library.md`, `03-ux/mobile-patterns.md`, `05-architecture/frontend-architecture.md`, `06-build-packs/frontend-build-pack.md`, `02-brand/voice-and-tone.md`, `05-architecture/i18n-rules.md` |
| Drafting workspace or AI conversation behavior | `08-guardrails/open-decisions.md`, `04-product/letter-generation.md`, `04-product/ai-provider-and-prompts.md`, `03-ux/user-flows.md`, `03-ux/page-specifications.md`, `05-architecture/system-contracts.md`, `05-architecture/api-contracts.md`, `06-build-packs/frontend-build-pack.md`, `06-build-packs/backend-build-pack.md` |
| Checkout, pricing, payment, refund | `08-guardrails/open-decisions.md`, `04-product/pricing-structure.md`, `04-product/auth-billing-accounts.md`, `03-ux/page-specifications.md`, `05-architecture/system-contracts.md`, `05-architecture/api-contracts.md`, `05-architecture/error-taxonomy.md`, `07-operations/security-and-privacy.md` |
| Dispatch, tracking, provider integration | `08-guardrails/open-decisions.md`, `08-guardrails/swiss-post-api-reference-map.md`, `08-guardrails/provider-certainties.md`, `08-guardrails/swiss-post-appendix.md`, `04-product/provider-submission-model.md`, `04-product/postal-dispatch.md`, `05-architecture/system-contracts.md`, `05-architecture/api-contracts.md`, `05-architecture/backend-architecture.md`, `05-architecture/error-taxonomy.md`, `06-build-packs/backend-build-pack.md` |
| Session, resume, email, and any future magic-link account work | `08-guardrails/open-decisions.md`, `04-product/email-flows.md`, `04-product/auth-billing-accounts.md`, `05-architecture/session-management.md`, `05-architecture/api-contracts.md`, `05-architecture/system-contracts.md`, `06-build-packs/backend-build-pack.md` |
| Rendering, PDF, template, attachments, files | `08-guardrails/open-decisions.md`, `04-product/provider-submission-model.md`, `04-product/document-template.md`, `04-product/a4-template-specification.md`, `04-product/signatures-and-attachments.md`, `04-product/file-handling.md`, `05-architecture/database-schema.md`, `05-architecture/api-contracts.md`, `06-build-packs/backend-build-pack.md` |
| Marketing copy, trust copy, SEO, public claims | `08-guardrails/open-decisions.md`, `08-guardrails/swiss-post-api-reference-map.md`, `08-guardrails/provider-certainties.md`, `03-ux/marketing-pages.md`, `02-brand/voice-and-tone.md`, `02-brand/seo-strategy.md`, `07-operations/security-and-privacy.md`, `04-product/ai-provider-and-prompts.md`, `04-product/postal-dispatch.md` |
| Admin or support tooling | `08-guardrails/open-decisions.md`, `06-build-packs/admin-build-pack.md`, `07-operations/admin-and-support.md`, `07-operations/security-and-privacy.md`, `05-architecture/api-contracts.md`, `05-architecture/error-taxonomy.md` |

If a task touches more than one row, read the union of those docs before coding.

## Hard rules

- **Never** invent a provider endpoint, payload field, tracking capability, or success meaning.
- **Never** convert an open question into code by intuition or by pattern-matching to other
  providers.
- **Never** create a fallback behavior that looks like success when real provider confirmation is
  missing.
- **Never** hide ambiguity in the UI. Unknown must stay unknown.
- **Never** use placeholder copy, dummy data, mock provider flows, fake file assets, fake
  references, or simulated production success states.
- **Never** ship TODO-driven, stubbed, partially wired, or deliberately incomplete production code paths.
- **Never** bypass the shared contracts layer.
- **Never** write provider-specific logic outside its designated adapter module.
- **Never** treat label or barcode generation as proof of physical dispatch.
- **Never** model Swiss Mail as operating its own print-and-mail workflow.
- **Never** make guest users depend on account-only assumptions.
- **Never** resolve a conflict between two docs by choosing the more convenient implementation.
- **Never** follow a cross-reference to a missing file by guessing what that file probably said.
- **Never** turn a marketing claim into code or UI copy unless the underlying fact is locked or verified.
- **Never** depend on prior chat history, unpublished notes, or "what the team probably meant" as an implementation source.
- **Never** satisfy the spec with generic CRUD-style UX if the documented experience requires guided leverage, immediate preview access, and materially reduced user effort.

## Required implementation pattern

Every feature must follow this order:

0. **Helicopter view first** — map the full end-to-end flow, module ownership, state boundaries, hooks/services, and failure states before writing implementation code
1. **Schema first** — define the canonical data shape in `shared/`
2. **State machine first** — define states and transitions before handler logic
3. **Adapter boundary first** — external integrations behind an adapter before any direct call
4. **Deterministic rendering path** — same layout logic for preview and final output
5. **Truthful user messages** — status strings come from normalized backend state
6. **Cleanup and retention as explicit jobs** — not side effects of request handlers
7. **Production completeness** — every written path must be fully connected, error-handled, tested, and ready for real data

## Planning rule

Before implementing a substantial area, the agent must produce an implementation plan that covers:

- system entry points and route/module boundaries
- shared contracts and state ownership
- centralized hooks/services/selectors needed to avoid duplicated frontend logic
- backend adapters, jobs, and idempotency points
- error, expiry, offline, and ambiguity states
- verification strategy

Do not implement large features screen-by-screen without this system view.

## Required review sweep per task

For every task, explicitly check:

1. Which user story or operational story is being changed?
2. Which routes, jobs, adapters, schemas, emails, and support flows can this affect?
3. Which decisions are locked, which are open, and which are only recommended?
4. Which user-facing claims or messages could become untrue after this change?
5. Which reusable hooks/services/modules must absorb the change so logic does not fork?

If those answers are not clear, more document review is required before coding.

## Recursive closeout rule

When a review, implementation, or cleanup task appears complete:

1. Recreate the TODO list from a fresh-eye pass over the affected concern area.
2. Resolve the newly found material items.
3. Repeat the fresh-eye TODO recreation until no new material items appear.
4. Then step back and do a helicopter-view review:
   does the result still serve the end goal of a complete, production-ready, best-in-class SaaS
   experience, or did local fixes drift into a narrower, technically-correct but weaker outcome?

Work is not complete if it only survives one pass from one angle.

## When blocked

If implementation depends on an unresolved question:

- Stop and document the blocker in the relevant doc
- Implement the surrounding structure without faking the missing part
- Add a clearly labeled decision point in `docs/`, not a secret default in code

If a referenced doc does not exist:

- Stop and treat it as a documentation defect
- Prefer the nearest current canonical doc rather than inventing a replacement
- Update the broken reference before implementation continues

If two current docs both claim to be canonical for the same scope:

- Treat that as a blocker
- Remove or rewrite the duplicate before implementation continues

If public copy makes a factual claim:

- Check whether the claim is backed by a locked decision, provider docs, or an approved legal/privacy text
- If not, soften or remove the claim

## Decision discipline

For every unresolved implementation decision:

1. Write three real options
2. Evaluate tradeoffs critically
3. Recommend one option with rationale
4. Explicitly reject the weaker options and say why

If that process has not happened, the decision is not ready for production code.

## Required pre-merge checklist

Before any AI-generated code is considered implementation-ready:

- [ ] Was there a system-level implementation plan before substantial coding started?
- [ ] Does every external integration sit behind an adapter?
- [ ] Does every user-visible status come from a real, normalized backend state?
- [ ] Are unknown provider details still marked unknown in docs and code comments?
- [ ] Are retention rules configurable rather than hardcoded?
- [ ] Is every canonical data shape defined in `shared/`?
- [ ] Does any UI text overpromise legal or postal certainty?
- [ ] Do any docs still conflict on a locked decision?
- [ ] Is there exactly one current canonical doc per scope, with no duplicate "definitive" spec for the same route or flow?
- [ ] Do any referenced docs fail to exist?
- [ ] Could a new implementer work correctly from the repository alone, without prior chat context?
- [ ] Does any public claim lack a locked decision or verified source?
- [ ] Are frontend hooks/state transitions centralized rather than reimplemented across screens?
- [ ] Does the UX feel materially easier than the manual baseline, rather than merely functional?
- [ ] Is every production code path complete, with no placeholder logic, TODO gates, or stub handlers?
- [ ] Did a recursive fresh-eye pass fail to produce any new material TODOs?
- [ ] Does a helicopter-view review still support the actual end goal, not just local consistency?

## Automated enforcement (CI and lint)

The following checks must be wired into CI and/or pre-commit hooks to catch anti-hallucination
violations mechanically, not just by review.

### 1. Placeholder and stub detection (CI grep check)

Run in CI on every PR. Fail the build if any match is found in production source files
(`frontend/src/**`, `backend/src/**`, `shared/src/**`):

```bash
# ci/check-placeholders.sh
PATTERNS=(
  'TODO'
  'FIXME'
  'HACK'
  'XXX'
  'placeholder'
  'mock.*provider'
  'fake.*response'
  'dummy'
  'lorem ipsum'
  'example\.com'
  'test@test'
  'your-.*-here'
  'CHANGEME'
  'replace.this'
)

COMBINED=$(IFS='|'; echo "${PATTERNS[*]}")
MATCHES=$(grep -rniE "$COMBINED" frontend/src/ backend/src/ shared/src/ \
  --include='*.ts' --include='*.tsx' \
  || true)

if [ -n "$MATCHES" ]; then
  echo "❌ Placeholder/stub patterns found in production code:"
  echo "$MATCHES"
  exit 1
fi
```

Allowed exceptions: test files (`**/*.test.ts`, `**/*.spec.ts`) and fixture directories.

### 2. Adapter boundary enforcement (ESLint rule)

No production code outside `backend/src/adapters/` may import provider SDKs directly:

```js
// .eslintrc.cjs (partial)
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['stripe', '@stripe/*'],
          message: 'Import Stripe only inside backend/src/adapters/payment/. Use PaymentAdapter interface elsewhere.',
        },
        {
          group: ['@anthropic-ai/*', 'openai'],
          message: 'Import AI SDKs only inside backend/src/adapters/ai/. Use AiAdapter interface elsewhere.',
        },
        // Add per-provider as integrations are added
      ],
    }],
  },
  overrides: [
    {
      files: ['backend/src/adapters/**/*.ts'],
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
};
```

### 3. Shared contract enforcement (ESLint + TypeScript paths)

Frontend and backend must never define their own request/response types for API calls. Enforce
via path aliases and lint:

```js
// No duplicate schema definitions
'no-restricted-imports': ['error', {
  patterns: [
    {
      group: ['zod'],
      importNames: ['z'],
      message: 'Define Zod schemas in shared/src/schemas/, not in frontend or backend code.',
    },
  ],
}],
```

Override for `shared/src/**` where Zod schemas are expected.

### 4. State machine integrity (unit test convention)

Every state machine (`DraftStatus`, `PaymentState`, `DispatchState`) must have a corresponding
test file that:
- Enumerates every valid transition
- Asserts that invalid transitions throw
- Uses the canonical enum from `shared/src/enums.ts`

CI check: fail if `shared/src/enums.ts` is modified but no corresponding test file is updated in
the same PR.

### 5. Doc-code consistency (CI cross-check)

```bash
# ci/check-doc-refs.sh
# Verify all cross-references in docs/ point to files that exist
grep -roP '\[.*?\]\((\.\.?/[^)]+)\)' docs/ | while IFS=: read -r file match; do
  # Extract relative path
  ref=$(echo "$match" | grep -oP '\(\.\.?/[^)#]+' | sed 's/^(//')
  dir=$(dirname "$file")
  target="$dir/$ref"
  if [ ! -f "$target" ] && [ ! -d "$target" ]; then
    echo "❌ Broken reference in $file → $ref"
    BROKEN=1
  fi
done
[ -z "$BROKEN" ] || exit 1
```

### 6. Pre-commit hook (lefthook)

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx}'
      run: npx eslint {staged_files}
    typecheck:
      run: npx tsc --noEmit
    placeholders:
      glob: '*.{ts,tsx}'
      run: bash ci/check-placeholders.sh
```

## Approval gate

No AI-generated code is implementation-ready until this checklist passes.
