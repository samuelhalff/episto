# Preview, QES, and Audience Design

## Scope

This change covers four connected UX and operations fixes:

1. Make the drafting workspace preview proportionate on wide screens.
2. Make the fullscreen preview use nearly the full viewport height.
3. Clean up the QES "coming soon" card so it is clearly clickable for release notifications and does not overlap its iconography on any viewport.
4. Add a minimal admin audience surface for exporting email lists for:
   - users who reached dispatch submission or beyond
   - QES release notification signups

## Workspace Preview

- Keep the existing desktop split-pane model.
- Replace the fixed preview width with an adaptive desktop width:
  - give the preview a real readable width on large displays
  - cap it so it does not dominate mid-sized desktops
  - keep the main workspace from stretching excessively when the preview is open
- Keep mobile and tablet behavior sheet-based rather than forcing a cramped split view.
- Preserve the existing per-draft preview open/closed preference.

## Fullscreen Preview

- Keep the existing sheet/modal pattern.
- On desktop, use almost the full available viewport height with modest outer padding.
- Preserve mobile full-height behavior.
- Keep the preview reading surface centered and immersive.

## QES Card

- Treat the unavailable QES tier as an explicit waitlist CTA rather than a passive disabled-looking option.
- Ensure the "coming soon" label and the bell/ring affordance do not collide.
- Add clear copy that clicking opens release notifications / waitlist signup.
- Preserve the existing waitlist dialog behavior and backend endpoint.

## Admin Audience

- Add a small admin page dedicated to email audiences.
- Include two exportable lists:
  - `sent_or_dispatching`: all sessions with an email and at least one draft at `submitted`, `dispatched`, or `closed`
  - `qes_waitlist`: all QES waitlist signups
- For the sent/dispatching list, include the furthest letter state reached so operators can distinguish:
  - `submitted` = sent / being dispatched
  - `dispatched`
  - `closed`
- Keep the UI intentionally minimal: totals, small tables, and CSV export actions.
- Keep the backend metadata-first: no letter content, no hidden marketing data model, only operationally relevant fields.

## Data Contract

### Sent / Dispatching audience row

- `email`
- `locale`
- `sessionId`
- `draftId`
- `furthestStatus`
- `createdAt`
- `lastStatusAt`

### QES waitlist row

- `email`
- `locale`
- `source`
- `createdAt`

## Verification

- Regression tests for source/layout contracts in the frontend.
- Route/contract tests for admin audience parsing and fetch helpers.
- Focused frontend and backend test runs plus typecheck before deployment.
