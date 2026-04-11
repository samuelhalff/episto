# Provider Submission Model

**Status:** Canonical product model  
**See also:** [postal-dispatch.md](postal-dispatch.md) · [document-template.md](document-template.md) · [pricing-structure.md](pricing-structure.md) · [../05-architecture/system-contracts.md](../05-architecture/system-contracts.md) · [../08-guardrails/provider-certainties.md](../08-guardrails/provider-certainties.md) · [../08-guardrails/swiss-post-api-reference-map.md](../08-guardrails/swiss-post-api-reference-map.md) · [../08-guardrails/provider-readiness-gate.md](../08-guardrails/provider-readiness-gate.md)

---

## Objective

Define the operational model of Episto clearly enough that implementers, reviewers, and AI tools
do not infer the wrong product shape.

---

## Core system model

Episto is an **AI-assisted formal-letter preparation and provider-submission product**.

Episto:

- helps the user draft and review a formal letter
- generates the canonical final PDF artifact on the server
- prepares the required dispatch metadata
- submits the provider-bound package through the locked Swiss Post API path
- normalizes provider responses into Episto's canonical states

Episto does **not**:

- operate its own print facility
- run a self-managed physical mail workflow
- guarantee provider acceptance, downstream delivery, or tracking depth
- guarantee legal validity of the letter content

Downstream physical production, postal handling, and any later delivery execution belong to the
configured provider path, not to Episto infrastructure.

---

## Dispatch definition

In Episto, **dispatch** means:

> preparation of the final provider-bound artifact and metadata, submission to the configured
> postal-provider path, and truthful handling of the provider response.

Dispatch does **not** mean:

- delivery to the recipient
- confirmed physical handoff unless the provider says so
- live tracking unless the provider supports it for that submission
- an Episto-operated print queue

---

## Submission unit

The canonical submission unit is:

1. the final server-generated PDF artifact for the letter
2. the required dispatch metadata
3. the selected delivery type
4. provider/account/auth context needed by the adapter
5. optional supporting-file references only if the provider-confirmed submission path supports them

The submission unit must never be assembled from client-side preview state at the moment of
submission. It must always come from backend-owned canonical records.

---

## Responsibility split

| Layer               | Episto owns                                                                  | Provider owns                                                    |
| ------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Drafting            | intent capture, AI drafting, structured editing, review flow                 | none                                                             |
| Artifact creation   | canonical server-side PDF generation from reviewed data                      | none                                                             |
| Metadata            | sender/recipient capture, validation, normalization, delivery-type selection | provider-side schema requirements                                |
| Submission          | provider adapter, idempotency, audit log, normalized state mapping           | request intake and provider-side acceptance/refusal              |
| Downstream handling | truthful status communication only                                           | physical production, postal handling, downstream delivery events |

---

## Final artifact contract

- The **provider-bound letter PDF** is a server-generated artifact derived from the immutable
  reviewed snapshot.
- The **downloadable confirmation document** is a separate, download-only bundle: page 1 is the
  Episto confirmation record, and the remaining pages are the exact provider-bound letter PDF.
  Do not submit the confirmation cover page to the provider.
- Client preview exists for UX confidence. It is not the source of truth for provider submission.
- Episto does not accept an arbitrary user-uploaded final letter PDF as the MVP send path.
- A successful preview does not by itself prove provider acceptance.
- Any provider-specific artifact validation must happen before or during adapter submission, not in
  ad hoc UI logic.

Pre-production guardrail:

- ePost submission stays in explicit `mock` mode until production cutover.
- Mock mode must surface provider-shaped references, tracking fields, emails, and confirmation-PDF
  metadata so operations can validate the full flow without fee-bearing live submissions.
- Turning on live ePost submission is a production-only switch, not a convenience toggle for dev or
  staging.

---

## Status meanings

These meanings must remain stable across product copy, API responses, support tooling, and internal
docs.

| State        | Meaning                                                           | Must not be collapsed into                                  |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `queued`     | Backend work is preparing or scheduling provider submission       | `submitted`                                                 |
| `submitted`  | Episto created and sent the provider-facing submission attempt    | `accepted`, `delivered`                                     |
| `accepted`   | The provider accepted the submission into its downstream workflow | `delivered`                                                 |
| `rejected`   | The provider deterministically refused the submission             | `unknown`                                                   |
| `unknown`    | The outcome is ambiguous or unconfirmed                           | `submitted`, `accepted`                                     |
| `reconciled` | Episto resolved a previously ambiguous case                       | `accepted` unless reconciliation actually proved acceptance |

Canonical language rules:

- `submitted` does not mean delivered
- `accepted` does not mean delivered
- a provider reference is not automatically tracking
- payment success is not the same thing as dispatch success

---

## Attachments boundary

Attachments are supporting assets, not part of the editable letter body model.

Current locked posture:

- users may upload approved supporting files in the product flow
- attachments remain separate internal assets from the canonical letter PDF
- the provider-side packaging of attachments is **not** locked until Swiss Post onboarding docs
  confirm the supported submission shape

Implementation rule:

- if the provider-confirmed launch path cannot support attachments safely, Episto must disable
  attachment submission at launch rather than inventing a merged-PDF or multi-part workflow

---

## Pricing implications

Episto pricing must reflect the full submission model, not only "mailing a PDF."

The customer-facing price may cover:

- AI-assisted drafting
- structured review and editing
- final PDF generation
- dispatch metadata preparation
- provider submission and reconciliation overhead
- payment processing and support overhead
- provider-side dispatch cost

The locked launch price is a product decision. It must still be re-validated against real provider
commercial terms before public launch. Do not change public prices casually, and do not model price
as if it were independent from provider economics.

---

## Support implications

Support must be able to inspect, at minimum:

- payment state
- reviewed snapshot / artifact generation state
- dispatch attempt state
- normalized rejection or ambiguity reason
- provider reference when a real one exists
- refund or manual-review state

Support must never need raw provider jargon to explain a case to the user.

---

## Wrong mental models to avoid

Do **not** model Episto as:

- a print shop
- a self-operated mail house
- a generic document-upload postage reseller
- a legal-advice product
- a word processor with dispatch bolted on

Model Episto as:

- AI-assisted structured formal-letter preparation
- server-generated final PDF creation
- metadata validation and normalization
- provider submission through a postal adapter
- truthful payment and dispatch state handling

---

## Production blocker for adapter internals

No Swiss Post adapter implementation may hardcode provider product identifiers, payload fields,
attachment packaging, or acceptance semantics until those details are confirmed from current Swiss
Post-issued onboarding or technical documentation.
