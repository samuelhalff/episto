# Provider Certainties and Unknowns

Last verified: 2026-03-15

## Rule

Every unknown in this table must remain explicit in docs or in deliberate code-level unknown markers
until it is replaced by a real decision backed by a verifiable source. Do not hide unresolved facts
inside casual TODO comments.

## Matrix

Swiss Post rows are summaries only. See [`swiss-post-appendix.md`](swiss-post-appendix.md) for
verified sources, exact evidence, and implications per item.

| Domain | What is certain | What is still unknown | Forbidden assumption |
|---|---|---|---|
| Swiss Post (5 items — see appendix §1–§5) | Digital Commerce API surface exists; barcode generates labels; Track consignments WSDL published; SmartSend is a current product; legacy Print and Send is EOL | MVP dispatch path; exact payloads; attachment rules; trackability per reference type | That any of these individually confirm a ready-to-code letter dispatch integration |
| Stripe | Chosen payment provider | Exact capture and refund mechanics for this product's dispatch timing | That the default Stripe checkout flow matches this product's needs without design work |
| Email provider | Managed transactional email is the intended category | Exact vendor selection, webhook model | That email history storage should be permanent |
| Hosting | Infomaniak is the current preference | Exact topology, DB mode, storage plan, queue hosting arrangement | That infrastructure-specific behavior can be baked into code now |

## What to do with unknowns

- Keep them marked as unknown in docs or in explicit code markers such as `UNKNOWN` constants or
  blocked adapter methods
- Do not resolve unknowns by guessing or copying from similar products
- Update this file when a real source confirms or refutes any unknown
- See [`swiss-post-appendix.md`](swiss-post-appendix.md) for more detail on Swiss Post specifics
