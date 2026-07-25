# Non-Goals and Forbidden Shortcuts

## Non-goals for MVP

These are explicitly out of scope. Do not build them.

- Full word processor or rich-text editor
- Legal-advice engine or legal-validity certification
- Business template suite
- Multi-country postal platform
- Self-operated print house or mail-house workflow
- Heavy admin back office
- Permanent document vault

## Forbidden shortcuts

The following must never appear in any production code path:

- No mock success states in production flows
- No mock data pipelines or fake provider implementations used as hidden stepping stones
- No placeholder text or placeholder values left in production code paths
- No fake tracking numbers or fake provider references
- No direct postal-provider calls from the frontend
- No implementation or copy that claims episto physically prints letters itself
- No raw provider payloads leaking into product UI responses
- No hidden permanent retention of letter content
- No hardcoded retention durations without a documented decision
- No silent account requirement for guest flows
- No barcode or label flow presented as full dispatch unless explicitly confirmed by provider docs
- No old legacy provider manuals treated as current truth without verification
- No rich-text editor dependency added just because it seems convenient
- No legal-validity marketing claims without explicit documented basis
- No implementation that silently picks one side of a documented conflict without fixing the docs
- No replacing missing documentation with inferred requirements
- No silent or undocumented overrides of locked launch pricing

## Architectural shortcuts that are also forbidden

- Duplicating schemas between frontend and backend by hand (use `shared/`)
- Embedding business rules only in UI components with no backend equivalent
- Treating ambiguous dispatch state as success
- Burying unresolved provider questions inside TODO comments without updating the relevant doc in
  `docs/`

## Rule

If a shortcut would make the product appear more complete than the current confirmed facts support,
it is forbidden.

Appearing finished is not the same as being correct. A truthful "pending" state is always better
than a fabricated "sent" state.
