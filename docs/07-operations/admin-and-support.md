# Admin and Support

> **Canonical implementation source:** [`docs/06-build-packs/admin-build-pack.md`](../06-build-packs/admin-build-pack.md)
> **See also:** [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)
> for the provider-dependent support touchpoints.

This file defines the support operating posture that the admin build pack must implement.

## Core rule

Support for Swiss Mail is **metadata-first and API-submission aware**.

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

## Support must not do

- invent provider certainty from partial metadata
- expose raw provider error payloads directly to users
- imply delivery when the state is only `submitted` or `accepted`
- rely on retained letter content when metadata already explains the case

## Launch service posture

- Primary support channel: email
- Public self-serve help content is required at launch for payment, dispatch-status, refund, and resume-link questions
- Support triage must run in a real queue or helpdesk workflow, not an unmanaged shared inbox
- First-response target: 1 business day
- Duplicate-payment concern: same business day
- Payment-captured / dispatch-ambiguous cases: reviewed same business day
- Content access only when operationally necessary and still within retention

## Launch minimum support system

Before launch, operations must have:

- a help/contact page with clear routing for common issues
- canned responses for duplicate payment, dispatch ambiguity, rejection, and refund timing
- a daily manual-review path for ambiguous dispatch outcomes
- named ownership for support inbox monitoring on business days

## Relationship to the admin build pack

The build pack remains the place for page-by-page admin implementation, search fields, and allowed
actions. This file exists so product, support, and engineering share the same support model before
UI details are implemented.
