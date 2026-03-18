# Provider Certainties and Unknowns

Last verified: 2026-03-17

## Rule

Every unknown in this table must remain explicit in docs or in deliberate code-level unknown markers
until it is replaced by a real decision backed by a verifiable source. Do not hide unresolved facts
inside casual TODO comments.

## Matrix

Swiss Post rows are summaries only. See [`swiss-post-appendix.md`](swiss-post-appendix.md) for
verified sources, exact evidence, and implications per item.

| Domain | What is certain | What is still unknown | Forbidden assumption |
|---|---|---|---|
| Operating model | Swiss Mail owns drafting, canonical PDF generation, metadata preparation, provider submission, and status normalization; Swiss Mail does not run its own print-and-mail workflow | Exact Swiss Post product mapping and provider-side downstream handling details | That Swiss Mail should be implemented as a self-operated print house |
| Swiss Post (5 items — see appendix §1–§5) | Direct Swiss Post Digital Commerce API is the locked provider path; barcode generates labels; Track consignments WSDL published; legacy Print and Send is EOL | Exact dispatch payloads; attachment rules; trackability per reference type; webhook availability | That public pages alone are sufficient to code the adapter without current onboarding docs |
| Stripe | Chosen payment provider | Exact capture and refund mechanics for this product's dispatch timing | That the default Stripe checkout flow matches this product's needs without design work |
| Azure AI | Azure-hosted model API is the locked AI path | Exact region, deployment names, quota/rate-limit tuning | That any specific Azure region/model pair is available without deployment validation |
| Email provider | Resend is the locked transactional email provider | Exact webhook subset used in MVP; domain warm-up timeline | That email history storage should be permanent |
| Hosting | Infomaniak-centered topology is locked | Exact SKU names, cluster sizing, and whether managed DB offerings are launch-ready for this workload | That infrastructure-specific behavior can be baked into code now, or that a managed DB SKU is production-ready without validation |

## What to do with unknowns

- Keep them marked as unknown in docs or in explicit code markers such as `UNKNOWN` constants or
  blocked adapter methods
- Do not resolve unknowns by guessing or copying from similar products
- Update this file when a real source confirms or refutes any unknown
- See [`swiss-post-appendix.md`](swiss-post-appendix.md) for more detail on Swiss Post specifics
