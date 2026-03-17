# Dev Workflow and Repo Rules

> Cross-reference: `deployment-and-ci.md` for CI/CD pipeline, environment promotion, and
> deployment targets.

## Repository structure

```
docs/
frontend/
backend/
shared/
```

All canonical TypeScript schemas, enums, and types live in `shared/`. Both `frontend/` and
`backend/` import from there.

## Build order

Follow this sequence for any new feature. Do not skip steps.

1. **Classify the task and read the right docs** — use the task-routing protocol in `../08-guardrails/ai-implementation-rules.md`
2. **Update docs and decisions** — document the decision before writing code
3. **Plan the system shape** — routes, modules, hooks/services, contracts, failure states
4. **Define shared schemas and enums** — canonical types in `shared/` first
5. **Build backend state machines and adapters** — state transitions and provider isolation
6. **Build frontend state and flows** — consume canonical types from `shared/`
7. **Add provider integration details** — adapter implementation against confirmed specs
8. **Admin and polish** — admin visibility, error messages, edge-case handling

## Rules for contributors and AI agents

- Update docs when a decision changes
- Add or update shared contracts before writing feature code that depends on them
- Keep all provider-specific logic isolated inside its adapter module
- Map all user-facing messages from canonical states — no hardcoded UI strings
- Do not merge code that depends on an undocumented assumption
- Do not merge placeholder copy, placeholder env logic, mock provider paths, or fake success
  behavior
- If docs conflict, resolve the docs first; do not let code become the tie-breaker
- If a referenced doc is missing, fix the reference or add the missing canonical doc before coding
- If a public-facing claim cannot be traced to a locked decision or verified source, remove or soften it
- Plan substantial features from a helicopter view before implementing components or endpoints
- Centralize reusable frontend behavior in shared hooks/services instead of duplicating logic per screen
- Do not leave TODOs, stubs, placeholder handlers, or incomplete production branches in merge-ready code
- Review the full affected concern set, not just one convenient file or one example mentioned in chat
- Before calling a task finished, regenerate TODOs from a fresh-eye pass and repeat until no new material items appear
- After the recursive TODO loop, step back and verify the work still supports the end goal from a helicopter view

## Decision workflow

Before locking any implementation-significant decision:

1. Write three options
2. Compare them on: budget, reliability, speed, security, maintenance, UX clarity
3. Choose the best option and document why the alternatives were rejected

A decision without a three-option review is not ready for production code.

## Testing expectations

| Area | Requirement |
|---|---|
| State transitions | Unit tests required |
| Adapter normalization | Tests required |
| Payment idempotency | Tests required |
| Dispatch idempotency | Tests required |
| File cleanup jobs | Tests required |
| Provider capability claims | No test may assert invented provider behavior as fact |
| Test fixtures | Must reflect real canonical schemas, not placeholder shapes |
| Shared hook/service coverage | Core reusable frontend logic must be tested at the hook/service boundary |

## Change management

Every meaningful change should answer:

- What new fact became known?
- Which doc changed?
- Which contract changed?
- What assumption was removed or made explicit?

Document these answers in the commit message or the relevant doc — not only in code comments.
