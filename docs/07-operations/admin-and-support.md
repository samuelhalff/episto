# Admin and Support

> **Canonical implementation source:** [`docs/06-build-packs/admin-build-pack.md`](../06-build-packs/admin-build-pack.md)
> **See also:** [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)
> for the provider-dependent support touchpoints.

This file defines the support operating posture that the admin build pack must implement.

## Core rule

Support for Swiss Mail is **metadata-first and API-submission aware**.

This is strict for provider data: admin may use the minimum provider references needed to re-query
or reconcile ePost, but admin must not become a raw provider payload archive.

Support is not answering "did we print it yet?" Support is answering questions such as:

- did payment authorize or capture?
- was the final PDF generated?
- was the provider submission attempt created?
- did Swiss Post accept, reject, or leave the outcome ambiguous?
- is a refund pending or complete?

## Support must be able to see

- payment state and references
- dispatch attempt state
- normalized rejection or ambiguity reason
- provider reference when a real one exists
- refund / manual-review state
- retention status for letter content and file assets
- whether a provider-backed dispatch can be safely re-queried using the retained reference only

## Support must not do

- invent provider certainty from partial metadata
- expose raw provider error payloads directly to users
- imply delivery when the state is only `submitted` or `accepted`
- rely on retained letter content when metadata already explains the case
- retain or display raw ePost payloads in admin as a support shortcut

## Launch service posture

- Primary support channel: email
- Public self-serve help content is required at launch for payment, dispatch-status, refund, and resume-link questions
- Support triage must run in a real queue or helpdesk workflow, not an unmanaged shared inbox
- First-response target: 1 business day
- Duplicate-payment concern: same business day
- Payment-captured / dispatch-ambiguous cases: reviewed same business day
- Content access only when operationally necessary and still within retention

## Helpdesk / queue rule

The support inbox may be the contact address, but operational triage must behave like a queue.

Minimum required fields per case:

- category (`payment`, `dispatch`, `refund`, `resume`, `abuse-review`, `other`)
- linked `sessionId` / `draftId` when known
- current owner
- current escalation status
- last customer-facing response timestamp

If the chosen tooling cannot support this minimal workflow, it is not sufficient for launch.

## Launch minimum support system

Before launch, operations must have:

- a help/contact page with clear routing for common issues
- canned responses for duplicate payment, dispatch ambiguity, rejection, and refund timing
- a daily manual-review path for ambiguous dispatch outcomes
- named ownership for support inbox monitoring on business days

## Support operating workflow

The minimum support workflow is:

1. intake through the primary support channel
2. metadata-first case lookup in admin
3. use canonical timelines and states before opening content
4. escalate into:
   - duplicate-payment handling
   - dispatch under-review handling
   - refund handling
   - suspicious-activity review

See:

- [`payment-dispatch-recovery.md`](payment-dispatch-recovery.md)
- [`abuse-and-fraud-ops.md`](abuse-and-fraud-ops.md)
- [`analytics-and-observability.md`](analytics-and-observability.md)

## Canned-response minimum set

Before launch, support must have approved replies for:

- duplicate-payment concern
- payment still pending review
- dispatch submitted but not yet accepted
- dispatch under review / ambiguous
- deterministic dispatch rejection
- refund issued but not yet settled
- resume link expired

These responses must use canonical state language, not improvised support phrasing.

## Daily review ownership

On each business day, named ownership must exist for:

- ambiguous dispatch cases
- duplicate-payment concerns
- suspicious-activity flags
- refund cases that remain pending

No support-critical queue should rely on "someone will probably notice."

## Relationship to the admin build pack

The build pack remains the place for page-by-page admin implementation, search fields, and allowed
actions. This file exists so product, support, and engineering share the same support model before
UI details are implemented.
