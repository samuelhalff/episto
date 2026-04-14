# Docs cleanup design

**Status:** Approved for implementation planning  
**Date:** 2026-04-14  
**Scope:** Remove temporary planning docs while preserving current canonical and referenced documentation

## Problem

The repository contains generated planning artifacts under `docs/superpowers/plans/` that do not belong in
the long-term product documentation set. At the same time, the repo also contains split reference docs and
one-off audit material that may look legacy at a glance but still participate in the current documentation
graph. This cleanup should remove the temporary plan artifacts without accidentally deleting referenced or
canonical docs.

## Current context

- `docs/superpowers/plans/2026-04-14-landing-page-macos-window-dots.md` is tracked in Git.
- `docs/superpowers/plans/2026-04-14-help-faq-and-cta.md` is currently untracked.
- `docs/superpowers/specs/` contains approved design specs that the user wants to keep.
- No files in the repository currently reference `docs/superpowers/plans/`.
- The split `*-part-*.md` files are still referenced from their parent canonical docs, so they are not safe
  to remove in this task.
- `docs/03-ux/chat-ui-audit.md` is still referenced from `docs/03-ux/page-specifications-part-03.md`, so it
  is not in scope for deletion.
- Older-looking docs such as `docs/09-legal-and-ux/*` may warrant a separate review later, but they are
  outside the approved cleanup scope for this task.

## Decision

Use a targeted documentation cleanup:

1. Remove all files under `docs/superpowers/plans/`.
2. Keep all files under `docs/superpowers/specs/`.
3. Leave split reference docs, audit docs, legal docs, and other canonical documentation untouched.
4. Let Git remove the empty `docs/superpowers/plans/` directory as a side effect of deleting its contents.

This is the smallest change that removes clear workflow residue while preserving the documentation that still
has active project value.

## Cleanup scope

### Remove

- `docs/superpowers/plans/2026-04-14-landing-page-macos-window-dots.md`
- `docs/superpowers/plans/2026-04-14-help-faq-and-cta.md`

### Keep

- `docs/superpowers/specs/2026-04-14-landing-page-macos-window-dots-design.md`
- `docs/superpowers/specs/2026-04-14-help-faq-and-cta-design.md`
- all referenced `*-part-*.md` documents
- `docs/03-ux/chat-ui-audit.md`
- all docs currently linked from `docs/index.md`

## Safety rules

- Do not remove any markdown file that is still referenced from another doc.
- Do not rewrite or consolidate split docs as part of this task.
- Do not change the canonical documentation index or authority rules.
- Do not remove specs the user explicitly asked to keep.
- Do not expand the task into a general-purpose docs reorganization.

## Validation

The cleanup should confirm only documentation-scope safety checks:

1. verify the plan docs are not referenced anywhere in the repository
2. verify the deleted files are the only documentation removals
3. verify the resulting Git state is ready to commit and push on `main`

Because this task only removes temporary docs, no frontend/backend build or test changes are expected.

## Push strategy

- make the targeted deletions on `main`
- commit with a docs-focused message
- push `main` after confirming only the approved cleanup is included

## Non-goals

- deleting `docs/superpowers/specs/*`
- removing split docs simply because they look old or large
- rewriting `docs/index.md`
- deleting `docs/03-ux/chat-ui-audit.md`
- deleting `docs/09-legal-and-ux/*`
- changing application code, tests, or product behavior
