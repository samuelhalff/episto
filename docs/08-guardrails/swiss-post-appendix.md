# Swiss Post Appendix

Last verified against current public official pages: 2026-03-31

## Public reference set

Use these official pages as the public evidence set for Swiss Post-related documentation:

- Digital Commerce API overview: https://developer.post.ch/en/digital-commerce-api
- Track consignments web service: https://www.post.ch/en/business-solutions/digital-commerce/track-consignments-web-service
- ePost SmartSend background page: https://www.epost.ch/en/business-customers/smartsend
- ePost Public API portal: https://developer.epost.ch/
- ePost / KLARA Swagger UI: https://api.epost.ch/docs
- ePost / KLARA OpenAPI document: https://api.epost.ch/openapi?query=ePost

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

### 5. ePost Public API exposes a current KLARA / oneAPI-style delivery surface

Official sources:

- https://developer.epost.ch/
- https://api.epost.ch/docs
- https://api.epost.ch/openapi?query=ePost

Verified from the current public docs and OpenAPI document:

- The public API exposes an `ePost` group with delivery, preview, monitoring, digital-letterbox,
  and authentication tags
- The documented auth schemes are `apiKeyAuth` using header `X-API-KEY` and `bearerAuth` using a
  JWT bearer token
- Preview endpoints exist for non-submitting checks:
  - `POST /epost/preview/delivery-channels`
  - `GET /epost/preview/delivery-channels/{preview-id}/status`
  - `POST /epost/preview/delivery-prices`
  - `GET /epost/preview/delivery-prices/{preview-id}/status`
- Delivery and monitoring endpoints exist:
  - `POST /epost/v2/deliveries`
  - `GET /epost/v2/deliveries/{delivery-id}/status`
  - `GET /epost/deliveries/monitoring`
- Preview and delivery requests use `multipart/form-data`
- The top-level request shape is `metadata` plus optional `files` / `largeFile`
- Per-document metadata requires `fileName`, `deliveryChannelPreferences`, and `recipients`
- The public schema also exposes a generic `documentTypes` metadata field with accepted values
  `message`, `invoice`, `contract`, and `hr`; this is document classification metadata, not the
  physical postage/service selection
- Recipient data can be supplied via `unhashedCredentials`, including fields such as
  `firstName`, `lastName`, `companyName`, `street`, `streetNumber`, `zipCode`, `city`, `email`,
  and `mobileNumber`
- For physical delivery, `physicalAdditionalInfo` includes `shippingCountry`, `envelopeSize`,
  `postage`, `windowLocation`, `duplex`, and optional `senderAddress`
- The `senderAddress` schema text explicitly says it is the "Address to be printed on the letter as
  sender address" and that if it is omitted, "the company address of the sender tenant will be
  printed on the letter as sender address"
- The physical `postage` enum exposes `A_POST`, `B_POST`, `B_POST_LARGEVOLUME`, `A_PLUS`, and
  `REGISTERED`
- For preview requests, `physicalAdditionalInfo.numberOfPage` can be supplied when no file is
  uploaded
- `BinaryFileV2` states that uploaded PDFs have to be delivered in PDF/A format
- Public size limits documented on preview and delivery endpoints:
  - total delivery size limit: `2GB`
  - per-document size limit (`binary + metadata`): `200MB`
  - `largeFile` mode: `1GB`, but only for specially activated senders and only for `DIGITAL`
- The public request schema models `files` as an array but does **not** publish an explicit
  `maxItems` limit for `files`
- The physical-mail attachment control exposed in the public schema is a singular
  `physicalAdditionalInfo.attachment` string field, not an array and not an `attachments` object
- No dedicated public request field was found for Swiss Post-style value-added options such as
  return receipt, personal delivery, or "return as unregistered"
- The public status/update model includes `ThirdPartyStatus.UNDELIVERABLE`, and the print-partner
  update schema includes a `letterId` described as a letter that was printed and packed in an
  envelope
- Successful delivery status includes a `trackingNumber` field whose schema text says it is
  relevant for `REGISTERED` and `A_PLUS`

**Implication:** There is a current public ePost / KLARA API surface that is rich enough to test
preview and monitoring behavior without sending a live letter. This does **not** by itself change
the locked MVP provider decision in this repository, and it does not prove that every tenant key is
provisioned for live physical-mail submission.

---

### 6. Legacy E-Post Print and Send material should be treated cautiously

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

## Operational conclusion (as of 2026-03-31)

- **LOCKED IMPLEMENTATION PATH:** We are building against the current **ePost / KLARA oneAPI**
  surface at `api.epost.ch`, NOT SmartSend. See [`open-decisions.md`](./open-decisions.md).
- Swiss Post clearly offers related digital-commerce and tracking capabilities in parallel, but the
  currently validated physical-letter API surface in this repository is the ePost oneAPI path
- SmartSend is a real current sending product but is **rejected for MVP implementation**.
- Provider readiness is still not the same as launch readiness: sender return-routing, attachment
  packaging, and some downstream semantics remain unproven

## Observed local preview probe (2026-03-31)

The following behavior was observed with a locally configured tenant key against `api.epost.ch`.
This is implementation evidence for exploration only. It is **not** a provider-choice decision.

- `GET /epost/deliveries/monitoring?limit=1` returned `200`, confirming monitoring access for the
  tested tenant key
- `POST /epost/preview/delivery-channels` with a metadata-only physical-mail probe returned `201`,
  and `GET /epost/preview/delivery-channels/{preview-id}/status` returned `FINISHED`
- That finished preview reported `availableChannels: [PHYSICAL]` for the probe recipient
- `POST /epost/preview/delivery-prices` with the same metadata-only probe returned `201`, and its
  status endpoint returned `FINISHED`
- That finished pricing preview reported a physical-channel price of `1.65` for a one-page
  `A_POST` / `CH` probe with `numberOfPage: 1` and no uploaded PDF
- Additional pricing preview probes on the same metadata shape returned:
  - `A_POST` -> `1.65`
  - `A_PLUS` -> `3.35`
  - `REGISTERED` -> `6.25`
- `POST /epost/preview/delivery-prices` also returned `FINISHED` when a small uploaded PDF was sent
  as `files[]`, suggesting the preview path accepts multipart file uploads in practice
- When a second uploaded PDF was added **without** setting `physicalAdditionalInfo.attachment`, the
  previewed `A_POST` price stayed `1.65`
- When `physicalAdditionalInfo.attachment` was set to a filename, the previewed `A_POST` price
  changed to `1.70`, even when no second uploaded file was included
- This suggests the current preview pricing engine keys off the `attachment` metadata field. It does
  **not** prove what the live submission path requires for real attachment binaries
- When extra uploaded PDFs were added **without** using the singular `attachment` metadata field, the
  preview result did not reflect an attachment surcharge
- Therefore the public evidence currently supports only a **single named attachment hint** at the
  metadata level; it does **not** document a public multi-attachment contract, count limit, or
  attachment-specific size limit beyond the general `2GB` / `200MB` delivery limits
- Digital-letterbox reads are **not** confirmed for the tested tenant key:
  - `GET /epost/v2/letters/inbox/count` returned `500` with `can.not.count.collections`
  - `GET /epost/v2/letters/deleted` returned `500` with `can.not.get.folders.metadata`
- An intentionally incomplete async live-delivery probe (`POST /epost/v2/deliveries` with metadata
  but no binary file) returned `201` with a delivery id, and the later status response contained a
  failed document entry with `errorCode: MISSING_BINARY_FILE_FOR_METADATA`
- That failed async attempt also appeared in `GET /epost/deliveries/monitoring`, so even invalid
  live-delivery attempts can create auditable monitoring records
- An intentionally incomplete synchronous live-delivery probe (`POST /epost/v2/synchronous-deliveries`
  with metadata but no binary file) returned an immediate error status with zero delivered
  recipients
- A real synchronous physical-letter submission with an uploaded PDF and `postage: REGISTERED`
  returned `DELIVERED` immediately for a one-recipient test
- In the provider UI, a label such as `Document type: contract` comes from the document metadata
  classification field, not from postal dispatch mode; the registered-mail service level is
  determined separately by `physicalAdditionalInfo.postage: REGISTERED`
- That successful synchronous response included `deliveryChannel: PHYSICAL` and a non-empty
  `trackingNumber`, confirming that the public status model does return trackable identifiers for at
  least one successful registered-letter submission
- Monitoring for that successful registered-letter test returned `cost: 6.25` and a pricing list of:
  - `Print and send porto` -> `5.8`
  - `Document envelope sending` -> `0.3`
  - `Document paper sending` -> `0.1`
  - `Document page sending` -> `0.05`
- Two separate invalid async delivery probes with different request-level sender values were accepted
  as distinct deliveries and retained distinct `senderName` values in monitoring metadata
- However, the monitoring/status payloads observed so far do **not** echo the full
  `physicalAdditionalInfo.senderAddress` object back to the caller
- A successful live registered delivery later appeared in the provider UI with:
  - `Sender: Ark Fiduciaire SA`
  - `Sender Case Id: return-live-1774945593700`
  - `Sender End To End Id: return-live-1774945593700`
  - `Delivery Channel Preference: [PHYSICAL]`
  - `Status: DELIVERED`
  - recipient status `SUCCESS`
- This is stronger operational evidence that request-level sender identity survives into the real
  provider sending record for at least one delivered physical letter
- But it still does **not** prove the unresolved point that matters most for episto: whether an
  undeliverable physical letter will actually be returned using the supplied sender address rather
  than a tenant default or another downstream rule
- The remaining verified evidence is:
  - the public `senderAddress` schema text says the provided sender address is what gets printed on
    the letter
  - monitoring metadata preserved distinct request-level `senderName` values across probes
  - a real delivered provider-UI record showed `Sender: Ark Fiduciaire SA` for
    `return-live-1774945593700`
  - the API still does **not** echo the full physical sender-address object back, and we do **not**
    yet have a controlled real-world return proving which address governs physical return routing
- Until provider-issued documentation or a stronger operational proof says otherwise, episto must
  treat actual physical **return-routing** as **unproven** rather than guaranteed, even though
  sender identity now appears to carry through into the provider UI for live deliveries
- Swiss Post's public registered-mail page confirms that return receipt exists as a postal product
  add-on, but the current public oneAPI request model still does **not** show a specific field to
  activate it

**Implication:** For at least one locally configured tenant, auth and product provisioning are good
enough to exercise preview and monitoring.

**Update (2026-07-25):** Live submission has since been proven in production. With
`EPOST_SUBMISSION_MODE=live`, a real end-to-end order was accepted by Swiss Post via
`POST /epost/v2/deliveries`; the returned `deliveryId` is stored as `dispatch_attempts.providerReference`
(with `trackingNumber`) and surfaced on the proof-of-sending justificatif. Preview success must still not
be equated with accepted dispatch, but accepted live dispatch is no longer unproven.

## What implementation must do

- Keep dispatch behind an adapter — no direct provider calls from application code
- Keep tracking behind a separate adapter or capability layer
- Do not hardcode payloads from guesswork or from reading marketing pages
- Do not assume barcode generation equals successful postal dispatch
- Do not assume standard-mail items have the same post-send visibility as registered items
- Update this file when onboarding or technical docs confirm or contradict any item above
