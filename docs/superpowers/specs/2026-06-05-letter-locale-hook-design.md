# Letter Locale Hook Design

## Goal

Keep every letter surface in one supported locale, whether the locale comes from the browser/session at draft creation or from an explicit user request during intake, drafting, or revision.

## Supported Locales

The letter locale is limited to the existing application locales:

- `de-CH`
- `fr-CH`
- `it-CH`
- `en-CH`

Unsupported language requests must not silently change the draft. The assistant must tell the user that Episto can currently prepare Swiss letters only in German, French, Italian, or English, and ask them to choose one of those locales.

## Architecture

`draft.locale` remains the canonical source of truth for letter language and locale formatting. The initial draft locale still comes from the session/browser. User-selected language changes and prompt-detected language changes both write the same `draft.locale` field.

The AI intake and revision pipeline detects supported locale-change requests, applies them before generation or revision, and uses the new locale for subject and body output. When the user requests an unsupported language, the pipeline emits an assistant message and leaves `draft.locale`, `subject`, `body`, and document metadata unchanged.

## Data Flow

1. A draft is created with `session.locale`.
2. Manual language controls call the existing draft update endpoint with `locale`.
3. Intake analysis may extract a supported `locale` field or an unsupported locale request marker.
4. Supported prompt locale changes update `draft.locale` through the same draft-field update path as other extracted fields.
5. First-draft generation and body revision use the effective locale for prompt instructions and validation.
6. Preview, review snapshots, and PDF rendering use `draft.locale` or `snapshot.locale` for salutation, closing, subject prefix, date formatting, and HTML language.
7. SSE `field_update` events include `locale`, so visible workspace sections refresh without a page reload.

## Translation Behavior

For a supported locale change after a body already exists, the revision step treats the request as a whole-letter translation/relocalization. It regenerates the complete subject and complete body in the target locale, preserving only facts already present in the draft and the user's instruction.

The body remains body-only content. Locale-specific salutation and closing are not stored in `body`; they are supplied by preview and rendering helpers from the current locale.

## Affected Components

- Shared contracts allow `locale` in `UpdateDraftInput`.
- Draft service persists `locale` while enforcing editable draft statuses.
- AI field update path permits `locale` and emits a field update.
- Intake prompt returns supported `locale` or an unsupported locale request.
- AI handler handles unsupported locale requests before generation/revision.
- Revision and generation use the effective locale immediately.
- Frontend draft hooks merge `locale` updates from PATCH and SSE.
- Existing preview/rendering code continues to derive all locale-specific formatting from `draft.locale` and `snapshot.locale`.

## Error Handling

Unsupported prompt request: persist or emit a normal assistant message explaining the supported locales, do not modify draft fields, and do not call generation/revision.

Unsupported API `locale`: reject through the shared `LocaleSchema` validation before service mutation.

Terminal drafts: keep existing edit restrictions. Locale changes are allowed only in editable statuses through manual PATCH; prompt-driven changes naturally operate only while the AI can edit the draft.

## Testing

Backend tests cover:

- Manual PATCH accepts supported `locale` and rejects unsupported values.
- AI intake extracts supported locale requests.
- AI prompt handling does not mutate the draft for unsupported locale requests and emits a clear assistant response.
- AI revision uses a supported requested locale to update `locale`, `subject`, `body`, and metadata.

Frontend/shared tests cover:

- `UpdateDraftInput` includes `locale`.
- Draft cache merging handles `locale` field updates.
- Preview-facing helpers use the changed locale for subject prefixes and framing.

## Non-Goals

- Adding new locales beyond `de-CH`, `fr-CH`, `it-CH`, and `en-CH`.
- Translating sender or recipient names and addresses.
- Storing salutation, closing, or rendered date strings in the draft body.
