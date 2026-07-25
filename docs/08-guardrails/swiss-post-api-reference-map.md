# Swiss Post API Reference Map

**Status:** Guardrail reference  
**Purpose:** Identify every documentation area whose correctness depends on Swiss Post API reality,
describe why that dependency exists, and point to the relevant internal and official references.
**See also:** [swiss-post-appendix.md](swiss-post-appendix.md) · [provider-certainties.md](provider-certainties.md) · [open-decisions.md](open-decisions.md)

---

## 1. Official public references

These are the current public Swiss Post pages that matter for this repository. They are evidence,
not permission to guess the unconfirmed adapter internals.

| Source                              | URL                                                                                       | What it is useful for                                                                                                                             | What it does **not** prove                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Digital Commerce API overview       | https://developer.post.ch/en/digital-commerce-api                                         | Confirms Swiss Post exposes `address`, `delivery`, `barcode`, and `pickpost` API surfaces; shows OAuth/OpenID Connect and registration references | Does not prove a public physical-letter submission payload for MVP                           |
| Address API / validation references | https://developer.post.ch/en/digital-commerce-api                                         | Grounds address-validation and postcode-autocomplete discussion                                                                                   | Does not lock our exact address-validation UX or provider-required fields                    |
| Delivery API references             | https://developer.post.ch/en/digital-commerce-api                                         | Grounds deliverability-related language and delivery-option dependency                                                                            | Does not define our canonical `DispatchState` or exact MVP submission model                  |
| Barcode API references              | https://developer.post.ch/en/digital-commerce-api                                         | Confirms label-generation capability and FE/window-envelope facts                                                                                 | Does not prove physical-letter dispatch or acceptance                                        |
| Registration / onboarding note      | https://developer.post.ch/en/digital-commerce-api                                         | Confirms registration is required and public self-service registration is not the whole process                                                   | Does not tell us the approved payload, scopes, or exact MVP product mapping                  |
| Track consignments web service      | https://www.post.ch/en/business-solutions/digital-commerce/track-consignments-web-service | Confirms separate tracking capability, WSDL publication, and SOAP interface                                                                       | Does not prove every dispatch reference is trackable                                         |
| ePost Public API docs               | https://api.epost.ch/docs                                                                 | Current public request/response surface for preview, delivery, and monitoring                                                                     | Does not by itself prove sender return-routing, attachment packaging, or tenant provisioning |
| ePost OpenAPI document              | https://api.epost.ch/openapi?query=ePost                                                  | Concrete schema evidence for auth, physical postage values, multipart shape, senderAddress, and status fields                                     | Does not by itself prove launch-ready downstream behavior                                    |
| ePost SmartSend product page        | https://www.epost.ch/en/business-customers/smartsend                                      | Useful competitor/background context and alternate-product caution                                                                                | Not the locked MVP provider path; not sufficient for implementation                          |

---

## 2. API-dependent documentation aspects

The table below is the repo-wide map of where Swiss Post API truth matters.

| Aspect                                    | Why it needs API grounding                                                                                                | Internal docs that should be consulted together                                                                                                                                                        | Official references                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Provider choice and onboarding boundary   | The app is locked to the ePost / KLARA oneAPI implementation path, but downstream handling details are still unconfirmed  | `08-guardrails/open-decisions.md`, `08-guardrails/provider-certainties.md`, `08-guardrails/swiss-post-appendix.md`, `05-architecture/stack-decisions.md`                                               | ePost Public API docs, ePost OpenAPI document, Digital Commerce API overview       |
| Operational product model                 | "What episto does" vs "what Swiss Post does" depends on real provider boundaries                                          | `04-product/provider-submission-model.md`, `01-vision/product-scope.md`, `01-vision/overview.md`                                                                                                       | ePost Public API docs, Digital Commerce API overview                               |
| Submission lifecycle and state semantics  | `submitted`, `accepted`, `rejected`, `unknown`, and `reconciled` must line up with what the provider can actually confirm | `04-product/postal-dispatch.md`, `05-architecture/system-contracts.md`, `05-architecture/database-schema.md`, `05-architecture/error-taxonomy.md`                                                      | ePost OpenAPI document, ePost Public API docs, Track consignments web service      |
| Address validation and recipient metadata | Product and API contracts must not claim provider validation depth we have not confirmed                                  | `04-product/postal-dispatch.md`, `05-architecture/api-contracts.md`, `03-ux/user-flows.md`, `03-ux/page-specifications.md`                                                                             | ePost OpenAPI document, Digital Commerce API overview (address references)         |
| Delivery-type promises                    | Standard vs registered behavior, delivery estimates, and "tracking" language depend on real provider support              | `04-product/postal-dispatch.md`, `03-ux/page-specifications.md`, `03-ux/marketing-pages.md`, `02-brand/voice-and-tone.md`                                                                              | ePost OpenAPI document, ePost Public API docs, Track consignments web service      |
| Provider references vs tracking           | A provider reference must not be mislabeled as tracking without evidence                                                  | `05-architecture/system-contracts.md`, `05-architecture/api-contracts.md`, `02-brand/voice-and-tone.md`, `03-ux/component-library.md`                                                                  | Track consignments web service                                                     |
| Final PDF artifact requirements           | The provider boundary is the reason the final PDF must be canonical, server-generated, and validated                      | `04-product/provider-submission-model.md`, `04-product/document-template.md`, `04-product/a4-template-specification.md`, `05-architecture/backend-architecture.md`                                     | ePost OpenAPI document, Barcode API references for FE/window-envelope context only |
| Attachments and supporting files          | Whether attachments are allowed, merged, separate, or disabled depends on provider-approved submission shape              | `04-product/signatures-and-attachments.md`, `04-product/file-handling.md`, `04-product/a4-template-specification.md`, `05-architecture/api-contracts.md`                                               | ePost OpenAPI document, ePost Public API docs, onboarding docs once obtained       |
| Payment capture timing                    | "Capture after acceptance" is only safe if the provider offers a deterministic enough acceptance moment                   | `08-guardrails/open-decisions.md`, `04-product/pricing-structure.md`, `05-architecture/system-contracts.md`, `05-architecture/backend-architecture.md`                                                 | ePost Public API docs, ePost OpenAPI document, onboarding docs once obtained       |
| Transactional email wording               | Receipt, submitted, accepted, and under-review emails must reflect true provider states                                   | `04-product/email-flows.md`, `02-brand/voice-and-tone.md`, `05-architecture/error-taxonomy.md`                                                                                                         | Digital Commerce API overview, Track consignments web service                      |
| Public marketing claims                   | Public copy about Swiss Post, delivery speed, or tracking must not overstate the provider contract                        | `03-ux/marketing-pages.md`, `03-ux/page-specifications.md`, `02-brand/voice-and-tone.md`, `02-brand/seo-strategy.md`                                                                                   | Digital Commerce API overview, Track consignments web service                      |
| Adapter architecture                      | Adapter interfaces, normalization rules, and onboarding blockers all depend on the API boundary being explicit            | `05-architecture/backend-architecture.md`, `06-build-packs/backend-build-pack.md`, `05-architecture/api-contracts.md`, `08-guardrails/ai-implementation-rules.md`                                      | ePost Public API docs, ePost OpenAPI document, Digital Commerce API overview       |
| Security and secrets                      | API-key/bearer handling, token posture, and webhook/polling posture depend on the real provider auth model                | `07-operations/security-and-privacy.md`, `05-architecture/backend-architecture.md`, `05-architecture/api-contracts.md`                                                                                 | ePost OpenAPI document, Digital Commerce API overview                              |
| Support and reconciliation                | Support tooling must reflect provider submission ambiguity and later tracking/reconciliation reality                      | `07-operations/admin-and-support.md`, `07-operations/incident-response.md`, `07-operations/payment-dispatch-recovery.md`, `07-operations/pre-launch-checklist.md`, `05-architecture/error-taxonomy.md` | ePost Public API docs, ePost OpenAPI document, Track consignments web service      |

---

## 3. What each public source contributes

### Digital Commerce API overview

Use this page when documentation needs to justify:

- that Swiss Post has a current API surface relevant to address, delivery, and barcode concerns
- that OAuth / OpenID Connect and registration are part of the integration model
- that onboarding is not optional for production integration

Do **not** use this page alone to justify:

- exact MVP submission payloads
- exact standard vs registered mapping
- attachment support
- synchronous acceptance semantics
- webhook availability

### Track consignments web service

Use this page when documentation needs to justify:

- that tracking is a separate provider concern
- that tracking uses its own interface and reference model
- that reference and tracking must be kept separate in product copy

Do **not** use it to justify:

- that every dispatch attempt will return a trackable identifier
- that standard mail has the same visibility as registered mail

### ePost SmartSend page

Use this page only for:

- competitive/background context
- explaining why alternate Swiss Post-family products must not be conflated with the locked MVP path

Do **not** use it as implementation evidence for the ePost oneAPI adapter.

---

## 4. Current documentation gaps that still require provider-issued material

These are the aspects that still cannot be closed from public pages alone:

1. Exact product/service identifiers and any tenant provisioning rules for standard and registered delivery
2. Exact request payload and response payload for the chosen physical-letter submission path
3. Exact acceptance signal used to trigger payment capture
4. Exact attachment packaging rules
5. Exact webhook vs polling capabilities
6. Exact mapping from provider references to trackable references
7. Exact auth and tenant-management expectations beyond the tested API-key path

Until those are confirmed from current Swiss Post-issued onboarding or contract material, the docs
must keep those points explicit and blocked rather than guessed.

---

## 5. Editing rule

If you update any doc that changes:

- dispatch wording
- tracking promises
- provider reference behavior
- attachment submission behavior
- payment-capture timing
- address-validation depth

then you must review this file, [swiss-post-appendix.md](swiss-post-appendix.md), and the affected
product/architecture doc together.
