# Provider Certainties and Unknowns

Last verified: 2026-04-01

## Rule

Every unknown in this table must remain explicit in docs or in deliberate code-level unknown markers
until it is replaced by a real decision backed by a verifiable source. Do not hide unresolved facts
inside casual TODO comments.

## Matrix

Swiss Post rows are summaries only. See [`swiss-post-appendix.md`](swiss-post-appendix.md) for
verified sources, exact evidence, and implications per item.

| Domain                                    | What is certain                                                                                                                                                                                                                                                | What is still unknown                                                                                                                          | Forbidden assumption                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Operating model                           | Swiss Mail owns drafting, canonical PDF generation, metadata preparation, provider submission, and status normalization; Swiss Mail does not run its own print-and-mail workflow                                                                               | Exact Swiss Post product mapping and provider-side downstream handling details                                                                 | That Swiss Mail should be implemented as a self-operated print house                                |
| Swiss Post (5 items — see appendix §1–§5) | ePost / KLARA oneAPI at `api.epost.ch` is the locked implementation path; barcode generates labels; Track consignments WSDL published; legacy Print and Send is EOL; live provider UI has shown request-level sender identity on a delivered registered letter | Exact dispatch payloads; attachment rules; trackability per reference type; webhook availability; exact undeliverable return-routing semantics | That public pages alone are sufficient to code the adapter without current docs and live validation |
| Stripe                                    | Chosen payment provider                                                                                                                                                                                                                                        | Exact capture and refund mechanics for this product's dispatch timing                                                                          | That the default Stripe checkout flow matches this product's needs without design work              |
| Azure AI                                  | Azure-hosted model API is the locked AI path                                                                                                                                                                                                                   | Exact region, deployment names, quota/rate-limit tuning                                                                                        | That any specific Azure region/model pair is available without deployment validation                |
| Email provider                            | Resend is the locked transactional email provider                                                                                                                                                                                                              | Exact webhook subset used in MVP; domain warm-up timeline                                                                                      | That email history storage should be permanent                                                      |
| Hosting                                   | VPS with Docker Compose topology is locked                                                                                                                                                                                                                     | Exact VPS sizing, TLS cert provisioning, and backup automation                                                                                 | That the VPS provider's specific tooling has been validated for production traffic                  |

## What to do with unknowns

- Keep them marked as unknown in docs or in explicit code markers such as `UNKNOWN` constants or
  blocked adapter methods
- Do not resolve unknowns by guessing or copying from similar products
- Update this file when a real source confirms or refutes any unknown
- See [`swiss-post-appendix.md`](swiss-post-appendix.md) for more detail on Swiss Post specifics
