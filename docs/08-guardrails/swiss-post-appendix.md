# Swiss Post Appendix

Last verified against current public official pages: 2026-03-15

## Public reference set

Use these official pages as the public evidence set for Swiss Post-related documentation:

- Digital Commerce API overview: https://developer.post.ch/en/digital-commerce-api
- Track consignments web service: https://www.post.ch/en/business-solutions/digital-commerce/track-consignments-web-service
- ePost SmartSend background page: https://www.epost.ch/en/business-customers/smartsend

For a repo-wide map of which internal docs depend on these sources, see
[`swiss-post-api-reference-map.md`](swiss-post-api-reference-map.md).

## Verified public facts

### 1. Swiss Post exposes a current Digital Commerce API surface

Official source: https://developer.post.ch/en/digital-commerce-api

Verified from the current page:
- There is an `address` endpoint
- There is a `delivery` endpoint
- There is a `barcode` endpoint
- There is a `pick@home` endpoint
- OAuth and OpenID Connect are part of the access model
- Registration is required; the public page points implementers to Swiss Post sales / `digitalintegration@post.ch`

**Implication:** A public developer page exists for address, delivery, and barcode-related
capabilities. This does not by itself prove a public "send physical letters" dispatch API suitable
for MVP.

---

### 2. The Barcode capability is label generation, not proof of physical-letter dispatch

Official source: https://developer.post.ch/en/digital-commerce-api

Verified from the current page:
- Barcode provides access to generate address labels
- The docs include FE window-envelope formats for letters with barcode

**Implication:** Label or barcode generation must not be confused with full physical mail
fulfillment. Do not treat a successful barcode call as dispatch confirmation.

---

### 3. Swiss Post has a current "Track consignments" business web service

Official source: https://www.post.ch/en/business-solutions/digital-commerce/track-consignments-web-service

Verified from the current page:
- The service is a SOAP web service
- A WSDL is published
- XML request and response examples are published for: `ShipmentsSearch`, `GetAllEvents`,
  `GetAllDetails`, `GetAllStatuses`

**Implication:** Tracking exists as a separate integration concern with its own onboarding and
reference model. It must not be assumed to work with every reference returned by a dispatch call.

---

### 4. ePost SmartSend is a current ePost business product

Official source: https://www.epost.ch/en/business-customers/smartsend

Verified from the current public page:
- SmartSend is a current business-mail product
- ePost positions it as daily business mail sent online
- ePost distinguishes multiple sending products: SmartSend, SecureSend/IncaMail, and oneAPI

**Implication:** SmartSend is a plausible dispatch-path candidate. Public marketing pages do not
expose enough implementation detail to hardcode payload assumptions.

---

### 5. Legacy E-Post Print and Send material should be treated cautiously

Source context: Swiss Post search results as of 2026-03-15

Observed in current search results:
- A recent FAQ states that legacy E-Post Print and Send / E-Post Business reached end of life
- Current "Print and Send" access is via KLARA

**Implication:** Do not build against old Print and Send manuals without confirming the current
active product path.

---

## What public material still does not answer

The following cannot be safely resolved from current public sources:

- Which exact dispatch product should power MVP
- The exact request payload for physical letter dispatch
- Whether attachments are supported, and in what form
- The exact difference in returned identifiers for standard vs registered mail
- Whether dispatch confirmation is synchronous or asynchronous
- Whether status webhooks exist for the chosen path
- Which customer/onboarding prerequisites apply

## Operational conclusion (as of 2026-03-15)

- **LOCKED DIRECTION:** We are building against the **Digital Commerce API** (Barcode + Address + Delivery), NOT SmartSend. See [`open-decisions.md`](./open-decisions.md).
- Swiss Post clearly offers related digital-commerce and tracking capabilities
- SmartSend is a real current sending product but is **rejected for MVP implementation**.
- Public evidence is insufficient to hardcode any MVP dispatch integration without completing
  onboarding and reviewing provider-provided technical documentation

## What implementation must do

- Keep dispatch behind an adapter — no direct provider calls from application code
- Keep tracking behind a separate adapter or capability layer
- Do not hardcode payloads from guesswork or from reading marketing pages
- Do not assume barcode generation equals successful postal dispatch
- Do not assume standard-mail items have the same post-send visibility as registered items
- Update this file when onboarding or technical docs confirm or contradict any item above
