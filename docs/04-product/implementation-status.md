# Implementation Status

**Status:** Audit snapshot, 2026-07-28. Describes what the code does, not what the specs intend.
**Scope:** Every concrete capability asserted by the `04-product/` specs and `01-vision/product-scope.md`, classified as shipped, built-but-unreachable, or not built. Where a spec asserts something the code contradicts, the spec is named as the defect.
**See also:** [`letter-generation.md`](letter-generation.md), [`postal-dispatch.md`](postal-dispatch.md), [`email-flows.md`](email-flows.md), [`file-handling.md`](file-handling.md), [`a4-template-specification.md`](a4-template-specification.md), [`qualified-signatures.md`](qualified-signatures.md), [`pricing-structure.md`](pricing-structure.md)

---

## How to read this

Three states, applied strictly:

- **Shipped** — a real user in production can reach it, and the path from route through service and
  worker to UI is unbroken.
- **Built but unreachable** — the code exists and probably works, but nothing invokes it: no caller,
  no UI entry point, no trigger, or a config value that is never set.
- **Not built** — no implementation, established by grep across `backend/src`, `frontend/src`, and
  `shared/src`.

Everything below is backed by a file that was opened during the audit. Where a claim could not be
established, it is not made.

---

## The core flow is real

Before the gaps: the spine of the product is genuinely shipped, and the audit found no smoke and
mirrors in it.

The seven-step generation pipeline in [`letter-generation.md`](letter-generation.md) exists in full.
Intent-and-risk classification, field extraction, and gap detection are collapsed into a single
`analyzeIntake()` call at `backend/src/modules/ai/ai.service.ts:153`, follow-up questioning lives at
`backend/src/modules/ai/ai.service.ts:269`, drafting at `:288`, and post-generation policy validation
at `:331`. The validation result actually gates output — `backend/src/modules/ai/ai.streaming.ts:80`
blocks the stream when severity is `blocked`, and blocked intent throws before drafting at
`backend/src/modules/ai/ai.service.ts:167`. Content moderation is therefore enforced twice, before
and after generation, which is more than the spec strictly requires.

Postal dispatch is likewise whole. The six-state machine the spec defines is the enum the database
actually uses (`backend/src/db/schema/dispatch.ts:18`), transitions are asserted against a shared
graph (`shared/src/state-machines.ts:84`), every transition is written to an audit table
(`backend/src/db/schema/dispatch.ts:87`), and a unique index on `payment_attempt_id`
(`backend/src/db/schema/dispatch.ts:81`) makes double-submission a database error rather than a
support ticket. Mock submission is refused in production at
`backend/src/modules/dispatch/adapters/epost.adapter.ts:171`. Registered versus standard delivery is
selected in the UI (`frontend/src/components/product/draft-flow/LogisticsStep.tsx:130`), priced
differently (`backend/src/modules/dispatch/adapters/epost.adapter.ts:125`), and mapped onto the
provider's postage field (`backend/src/modules/dispatch/adapters/epost-request-builders.ts:160`).

Dictation is real and end to end, which is worth stating because it is the kind of feature that
usually turns out to be a stub. There is a live WebSocket transcription route at
`backend/src/modules/drafting/dictation.routes.ts:189`, a buffered HTTP fallback at `:129`, an Azure
Speech adapter at `backend/src/modules/drafting/adapters/azure-speech-dictation.adapter.ts`, a
`useDictation` hook in `frontend/src/hooks/use-dictation.ts`, and a microphone button wired into the
intake step at `frontend/src/components/product/draft-flow/IntakeStep.tsx:205`.

The guest-first account model in [`auth-billing-accounts.md`](auth-billing-accounts.md) is honest:
the session type enum contains exactly one value, `guest`
(`backend/src/db/schema/auth.ts:4`), there are no login routes, and resume tokens are 256-bit and
SHA-256 hashed at rest (`backend/src/modules/sessions/session.service.ts:22`).

---

## Finding 1 — The dispatch-failure email throws instead of sending

**State: FIXED 2026-07-28.** `renderDispatchFailed` and `DISPATCH_FAILED_STRINGS` (4 locales) now
exist and are registered. The hand-written template list in `backend/tests/email-templates.test.ts`
— which is why this stayed green while broken — was replaced with one that derives template names by
scanning `backend/src` for `template: "…"` literals, so an enqueue site without a renderer now fails
the suite. The copy states plainly that the letter was not posted and the payment is being refunded,
and deliberately omits the provider's raw `failureReason`. Original finding below.

**State:** Built but broken at runtime. **Severity: highest.**

When a dispatch fails, `backend/src/modules/dispatch/dispatch-notifications.ts:76` enqueues an email
job with `template: "dispatch-failed"`. That template is not in the renderer registry: the map at
`backend/src/workers/email-templates.ts:439` contains only `dispatch-submitted`,
`dispatch-accepted`, `resume-link`, `refund-confirmed`, and `payment-receipt`. The lookup at
`backend/src/workers/email-templates.ts:455` throws `Unknown email template` for anything else.

The failure path is called from two places —
`backend/src/workers/submit-dispatch.worker.ts:339` and
`backend/src/workers/dispatch-submission-failure.ts:95` — so this is not a dormant branch. It fires
precisely when a paying customer's letter did not go out. The customer is told nothing; the job
fails in the queue.

**What it takes:** write `renderDispatchFailed`, add its strings to
`backend/src/workers/email-strings.ts`, register it in the map. An afternoon.
**Does it matter:** yes. This is the single worst-timed silence in the product.

---

## Finding 2 — Two email templates exist that nothing can ever send

**State: refund-confirmed WIRED 2026-07-28; resume-link deliberately deferred.**
`syncRefundsForCharge` is the single choke point every refund path funnels through (webhook,
dispatch settlement, `refund-once`, admin action), so the enqueue lives there rather than at four
call sites. It fires only for refunds that _transition_ into `succeeded` during that sync — the
function is idempotent and re-runs on every redelivered webhook, so "enqueue when successful" would
have mailed the customer repeatedly. The send happens after the transaction commits, keyed on the
Stripe refund id. Covered by `backend/tests/refund-notifications.integration.test.ts`.
`resume-link` stays unwired, with the reason recorded in
[`email-flows.md`](email-flows.md) — no step collects an email before checkout, so the trigger it
describes cannot exist yet. Original finding below.

**State:** Built but unreachable.

There are exactly four enqueue sites for the `send-transactional-email` queue, all confirmed by
grepping `SEND_EMAIL` across the backend: `dispatch-submitted`
(`backend/src/modules/dispatch/dispatch-notifications.ts:22`), `dispatch-accepted` (`:54`),
`dispatch-failed` (`:84`), and `payment-receipt`
(`backend/src/modules/payments/receipt-notifications.ts:133`).

Two fully-written, fully-localised templates have no caller at all:

- **Resume link** — `renderResumeLink` at `backend/src/workers/email-templates.ts:293`, strings at
  `backend/src/workers/email-strings.ts:183`. [`email-flows.md`](email-flows.md) lines 144–158
  promise both an automatic send after 48 hours of inactivity on an unpaid draft and a manual
  request. Neither exists. The resume _route_ works
  (`frontend/src/app/[locale]/resume/[token]/page.tsx`) and the session schema carries
  `resumeTokenHash` (`backend/src/db/schema/auth.ts:16`), so the only missing piece is the trigger.
- **Refund confirmation** — `renderRefundConfirmed` at
  `backend/src/workers/email-templates.ts:315`, strings at `backend/src/workers/email-strings.ts:221`.
  The refund webhook at `backend/src/modules/payments/payment-webhook.routes.ts:242` records the
  refund in the ledger and stops there. The customer's money comes back with no notification.

[`email-flows.md`](email-flows.md) describes both as part of the shipped flow. It is wrong on both
counts.

**What it takes:** for refunds, one `enqueueRefundEmail` call from the refund sync path — a few
hours. For resume links, an enqueue helper plus either a scheduled sweep or a request endpoint — a
day.
**Does it matter:** the refund email matters (silent money movement invites chargebacks). The resume
email is a conversion feature and its absence is a growth cost, not a trust cost.

---

## Finding 3 — The letter renders in the wrong typeface and no font is embedded

**State:** Not built as specified.

[`a4-template-specification.md`](a4-template-specification.md) line 284 records a **locked** decision:
Source Serif 4 for letter content "in both preview and final render", restated as CSS at line 347 and
as decision OD-T1 at line 493. Line 470 additionally requires the renderer to embed the chosen font
with no system substitution.

The letter template sets `font-family: "Helvetica Neue", Helvetica, Arial, sans-serif` at
`backend/src/modules/rendering/render-template.ts:192`, and no other font-family appears in that file
apart from the signature script face at `:52` and `:275`. The embedded-font blob
`EMBEDDED_FONTS_CSS` (`backend/src/modules/rendering/fonts.css.ts:5`) is imported only by
`receipt-document.ts:4` and `confirmation-document.ts:10` — the receipt and confirmation cover get
embedded fonts; the letter itself does not. In headless Chromium with no brand fonts installed, the
letter falls through to Arial or a generic sans.

The one thing this does _not_ break is preview/final drift: the frontend preview uses the identical
stack at `frontend/src/components/product/LetterPreview.tsx:161`. Preview and PDF agree with each
other and disagree with the spec.

**What it takes:** inject `EMBEDDED_FONTS_CSS` into the letter template and switch the body stack —
under an hour, plus a visual regression pass.
**Does it matter:** moderately. A formal Swiss letter in Arial reads cheaper than one in a serif, and
the customer is paying for exactly that impression. It is a quality gap, not a delivery risk.

---

## Finding 4 — The address window geometry in the spec is not the geometry in the code

**State:** reconciled 2026-07-28 — documentation only; no geometry changed.

[`a4-template-specification.md`](a4-template-specification.md) has been rewritten to the geometry the
code implements, as an explicit dated reversal rather than a silent edit. What changed: the recipient
block is now documented as the right-hand block at 121mm/52mm, 59mm wide, 31mm minimum height
(`shared/src/letter-layout.ts:17-22`), with the superseded locked values (25mm/55mm, 85mm × 45mm,
"CRITICAL") quoted in place and the right-window Swiss convention named as the reason; §2 replaces
the 20/20/25/20 margin lock with the two real mechanisms — `@page { margin: 0 }` plus absolute
positioning in a 210 × 297mm shell (`render-template.ts:191-194`, `:211-223`) and Puppeteer's
25/25/30/25 margin box (`render-pdf.ts:35-40`, applied to the letter via
`render-snapshot-pipeline.ts:87`); §5 records that the letter now renders in embedded Source Serif 4
in both preview and PDF as of 2026-07-28, closing Finding 3; the dispatch line, place/date block and
body flow region are documented at their implemented coordinates; and a new §4.1 lists the unbuilt
items plainly.

What stays open, per §4.1: **the geometry has never been checked against a physical Swiss
right-window envelope, and that verification cannot be established from source** — it remains the
blocker behind OD-T7; the effective offset produced by composing `@page { margin: 0 }` with the
Puppeteer margin box is unmeasured and untested; fold marks at 99mm and 198mm are not rendered;
continuation-page headers and page numbering do not exist; and no automated address-bounds check
runs. The unverified envelope-window figures once tabulated in §1 have been marked unverified rather
than restated — no envelope coordinates are recorded anywhere in this repository, and SN 010130 is
cited by name only. The original finding follows.

[`a4-template-specification.md`](a4-template-specification.md) line 162 marks the recipient block
position as **critical**: top-left at 25mm, 55mm, sized 85mm × 45mm, left-aligned, derived at line 47
from the DL envelope window offset. Line 181 adds a validation requirement — the block must not
extend past 100mm from the top, or the first fold at 99mm cuts through the address.

`shared/src/letter-layout.ts:18` places the recipient block at `top: 52, left: 121, width: 59,
minHeight: 31`. That is a right-hand address block, not a left one, and every dimension differs from
the spec. A right-aligned address is a legitimate Swiss convention, so this is most likely a
deliberate design change that never made it back into the document — but the document still calls its
own numbers critical and locked.

Three related spec requirements have no implementation. Fold marks at 99mm and 198mm
([`a4-template-specification.md`](a4-template-specification.md) lines 42–43, 101, 124) do not exist —
grepping the rendering module for fold-mark rendering finds nothing. Continuation-page headers and
page numbering (line 312) do not exist; there is no page counter in
`backend/src/modules/rendering/render-template.ts`. The bounds validation demanded by line 181 is not
performed anywhere in `backend/src/modules/rendering/render-snapshot-pipeline.ts`.

Page margins also differ. The spec locks 20/20/25/20 (top/bottom/left/right) at lines 66–69;
`backend/src/modules/rendering/render-pdf.ts:35` passes Puppeteer 25mm top, 25mm right, 30mm bottom,
25mm left. Note that the letter HTML sets `@page { margin: 0 }`
(`backend/src/modules/rendering/render-template.ts:186`) and positions everything absolutely inside a
210×297mm shell, while Puppeteer applies its own margin box on top at
`backend/src/modules/rendering/render-pdf.ts:53`. Whether the absolute mm coordinates land where
`letter-layout.ts` says they do on the physical page is not something this audit could establish from
source, and there are no tests in `backend/src/modules/rendering/` to settle it.

**What it takes:** reconcile the doc to the code (an hour), then physically verify one printed letter
against a real DL window envelope. Fold marks are two positioned divs; page numbering needs Puppeteer
header templates.
**Does it matter:** yes, if the address does not sit in the window, mail is returned. The audit
cannot say whether it does. That uncertainty is itself the finding — the geometry is load-bearing,
divergent from spec, and untested.

---

## Finding 5 — The four file-limit environment variables do not exist

**State:** Closed. All four keys are in `backend/src/shared/config/env.ts`, defaulted to the shipped
values from `shared/src/limits.ts`, and read through `backend/src/modules/files/file-limits.ts` — the
multipart edge, per-file and per-draft validation, and the `attachmentConstraints` the API advertises
all use the configured numbers (`backend/tests/file-limits.test.ts`). The shared constants remain the
defaults and the frontend's pre-flight hints. `file-handling.md` now documents the real 27 MB total.
The original finding follows.

[`file-handling.md`](file-handling.md) lines 3–4 state the rule in bold: limits are configurable via
environment variables and "must not be hardcoded as magic numbers in application logic". Lines 23–26
name four config keys: `MAX_ATTACHMENT_FILE_BYTES`, `MAX_ATTACHMENTS_PER_DRAFT`,
`MAX_TOTAL_UPLOAD_BYTES`, `MAX_SIGNATURE_FILE_BYTES`.

None of them exist. Grepping all four names across `backend/src` and `.env.example` returns nothing.
The limits are compile-time constants in `shared/src/limits.ts:1-13`, consumed directly at
`backend/src/modules/files/file.routes.ts:143`. The total-upload constant is also a different number
from the spec: `shared/src/limits.ts:10` is 27 MB, the spec says 20 MB.

Everything else in that document is accurate. MIME allow-lists match (`shared/src/limits.ts:4` and
`:8`), magic-byte inspection is real (`backend/src/modules/files/upload-validation.ts:43`), storage is
S3-backed, and retention is genuinely env-configurable — `ATTACHMENT_RETENTION_HOURS_POST_DISPATCH`
and `PDF_RETENTION_HOURS_POST_DISPATCH` are in `backend/src/shared/config/env.ts:52-66`.

**What it takes:** four `z.coerce.number()` entries in the env schema and a plumb-through — half a
day.
**Does it matter:** not to a user today; the values are sane. It matters the first time someone needs
to raise a limit for a customer and discovers it requires a deploy.

---

## Smaller gaps, stated once

**Resolved 2026-07-28 (documentation, not code):** [`letter-generation.md`](letter-generation.md) now
marks both fields as unbuilt rather than canonical, records that `intent` covers only the category of
request, and states what an extraction step would have to solve before the fields would be worth
adding. The `tone` row there now reads `formal / neutral / firm`, matching the prompt. The finding
below stands as originally written.

**`factualClaims` and `requestedOutcome` do not exist.** [`letter-generation.md`](letter-generation.md)
lines 36–37 list them in the canonical field table, one conditional and one required. Grepping both
identifiers across `backend/src`, `shared/src`, and `frontend/src` returns zero hits. The intake
prompt extracts an equivalent intent in prose form, so nothing is broken, but the canonical schema in
the doc is aspirational rather than descriptive. Also in that table: `tone` is specified as
`formal / semi-formal`, while `backend/src/modules/ai/prompts/intake.ts:39` extracts
`formal | neutral | firm`.

**There is no AI provider fallback.** `backend/src/modules/ai/adapters/azure-openai.ts` is the only
adapter; `backend/src/shared/config/env.ts:71` offers two Azure modes and nothing else. Retries exist
(`backend/src/modules/ai/adapters/provider-retry.ts`) but an Azure region outage takes drafting down.
[`ai-provider-and-prompts.md`](ai-provider-and-prompts.md) leaves fallback marked open, so this is a
known gap rather than a doc defect.

**No "dispatch under review" email.** [`email-flows.md`](email-flows.md) lines 169–186 specify a
message for the ambiguous `unknown` dispatch state. No template, no strings, no caller. The state
itself is handled — `backend/src/workers/submit-dispatch.worker.ts:150` defers to reconciliation —
the customer just is not told.

---

## Documentation defects — specs that assert things that are not true

These are not lost features. They are places where the document is wrong, and reading it would
mislead an engineer or a lawyer.

**QES was removed; two specs still describe it as a live product tier.** Per
`docs/superpowers/plans/2026-06-10-remove-qes-swisssign-signing.md` this was deliberate, and the
removal is thorough: `shared/src/enums.ts:78` defines `SignatureFlowMode` as `{ none, visual }` only,
there are no `signature_session` or `signature_provider` tables in `backend/src/db/schema/`, the
fulfilment state machine at `shared/src/state-machines.ts:189` has a single visual path, and
`backend/src/modules/signing/fulfillment.service.ts:59` takes the old flow-mode argument as an ignored
`_signatureFlowMode`. [`qualified-signatures.md`](qualified-signatures.md) presented QES as a
readiness scaffold awaiting onboarding and told users they could choose it;
[`signatures-and-attachments.md`](signatures-and-attachments.md) pointed at that file as the
canonical model and described QES as gated rather than removed.

_Resolved 2026-07-28 (documentation only)._ `qualified-signatures.md` now opens by stating that QES
is not part of the product and was removed on 2026-06-10, and retains only the Swiss-law analysis as
clearly marked background. `signatures-and-attachments.md` is now the canonical signature model —
typed or drawn, one `visual` tier. The corresponding lock in
[`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md) is recorded as a dated
reversal, and [`../05-architecture/2026-04-20-swisssign-readiness-audit.md`](../05-architecture/2026-04-20-swisssign-readiness-audit.md)
carries an obsolescence header.

**Pricing spec says no promo codes; promo codes are live.**
[`pricing-structure.md`](pricing-structure.md) line 72 states "no coupon/promotion system at launch"
and line 186 records the decision as "Locked — no". Promo codes are implemented and reachable:
`backend/src/modules/payments/payment-checkout.routes.ts:35` accepts a `promoCode` on the checkout
body and applies it server-side at `:120`, backed by
`backend/src/modules/payments/promo.service.ts`, with a UI field on the checkout page. The feature is
correctly built — validation is server-side only, which is the right shape — but the locked decision
in the doc was stale.

_Resolved 2026-07-28 (documentation only)._ Both the exclusion list and the summary table in
[`pricing-structure.md`](pricing-structure.md) now show the original lock struck through with a
dated reversal, and a new _Promotions_ section records what shipped, where it lives, and that
validation and discount application are server-side only. The same reversal is recorded in
[`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md).

**VAT is implemented, contrary to an assumption easy to draw from the pricing doc.** Recorded here
because the audit initially flagged it as missing and that was wrong.
`backend/src/modules/payments/receipt.service.ts:26` issues an immutable Swiss VAT receipt carrying
`vatCents` and `vatRateBp` (`:122`, `:162`) plus the legal entity's UID
(`:137`), and public prices are documented as VAT-inclusive at 8.1% in
`backend/src/modules/pricing/public-pricing.service.ts:354`.

---

## Signatures, attachments, and moderation — verified as described

Recorded briefly so the absence of a finding is not read as an absence of checking.

Typed and drawn signatures both work. Drawn uploads are stored as a `signature` asset at
`backend/src/modules/files/file.routes.ts:196` and composited into the PDF via
`backend/src/modules/rendering/drawn-signature.ts:9`, with asset resolution at
`backend/src/modules/rendering/signature-image.ts:84`.

Attachments are transmitted to the provider as separate documents rather than merged into the letter
PDF — `backend/src/modules/dispatch/dispatch-package.service.ts:112` builds a distinct `attachments`
array alongside `renderedPdf`, and
`backend/src/modules/dispatch/adapters/epost-request-builders.ts:121` submits them separately. This
matches [`signatures-and-attachments.md`](signatures-and-attachments.md) line 49, which says they stay
operationally separate. Uploaded PDFs are additionally read into the drafting context by
`backend/src/modules/files/attachment-ingestion.service.ts`, with OCR for scans at
`backend/src/modules/files/ocr-adapter.ts:18` when Azure Document Intelligence is configured.

Malware scanning is absent, and this is not a gap: [`file-handling.md`](file-handling.md) phrases it
conditionally — "if malware scanning is added, quarantine before accepting" — so the spec never
promised it.

The moderation escalation queue is genuinely reachable by an operator, not just an endpoint: the
suspicious-case route is `backend/src/modules/admin/admin-flags.routes.ts:195` with derivation logic
at `:57`, surfaced in `frontend/src/app/[locale]/admin/flags/page.tsx`.

---

## Summary table

| Feature                                    | State                                    | Key evidence                                                                |
| ------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------- |
| 7-step generation pipeline                 | Shipped                                  | `backend/src/modules/ai/ai.service.ts:153,269,288,331`                      |
| Pre- and post-generation moderation        | Shipped                                  | `ai.service.ts:167`, `ai.streaming.ts:80`                                   |
| Admin escalation queue                     | Shipped                                  | `admin-flags.routes.ts:195`                                                 |
| `factualClaims`, `requestedOutcome` fields | Not built                                | zero grep hits repo-wide                                                    |
| AI provider fallback                       | Not built                                | only `adapters/azure-openai.ts`                                             |
| Dictation (live + buffered)                | Shipped                                  | `dictation.routes.ts:189,129`; `IntakeStep.tsx:205`                         |
| Registered vs standard delivery            | Shipped                                  | `LogisticsStep.tsx:130`; `epost.adapter.ts:125`                             |
| Dispatch state machine + audit log         | Shipped                                  | `db/schema/dispatch.ts:18,87`; `state-machines.ts:84`                       |
| Duplicate-submission guard                 | Shipped                                  | `db/schema/dispatch.ts:81`                                                  |
| Payment receipt email                      | Shipped                                  | `receipt-notifications.ts:133`                                              |
| Dispatch submitted / accepted emails       | Shipped                                  | `dispatch-notifications.ts:22,54`                                           |
| Dispatch **failed** email                  | Broken at runtime                        | queued `dispatch-notifications.ts:76`, absent from `email-templates.ts:439` |
| Resume-link email                          | Built but unreachable                    | `email-templates.ts:293`, no enqueue site                                   |
| Refund email                               | Built but unreachable                    | `email-templates.ts:315`, no enqueue site                                   |
| Dispatch-under-review email                | Not built                                | no template, strings, or caller                                             |
| Guest-first sessions, hashed resume tokens | Shipped                                  | `db/schema/auth.ts:4`; `session.service.ts:22`                              |
| Swiss VAT receipt                          | Shipped                                  | `receipt.service.ts:26,122,162`                                             |
| Promo codes                                | Shipped (doc says they should not exist) | `payment-checkout.routes.ts:120`                                            |
| Source Serif 4 letter font                 | Not built                                | `render-template.ts:192` uses Helvetica Neue                                |
| Embedded fonts in letter PDF               | Not built                                | `fonts.css.ts` imported only by receipt/confirmation                        |
| Spec address-window geometry               | Divergent                                | spec 25/55/85×45 vs `letter-layout.ts:18` 121/52/59×31                      |
| Fold marks at 99mm / 198mm                 | Not built                                | no fold rendering in `modules/rendering`                                    |
| Page numbering / continuation headers      | Not built                                | no page counter in `render-template.ts`                                     |
| Address-bounds validation before render    | Not built                                | absent from `render-snapshot-pipeline.ts`                                   |
| File-limit env vars                        | Not built                                | four names return zero grep hits                                            |
| MIME allow-list + magic-byte check         | Shipped                                  | `limits.ts:4,8`; `upload-validation.ts:43`                                  |
| Retention windows configurable             | Shipped                                  | `config/env.ts:52-66`                                                       |
| Typed + drawn signatures                   | Shipped                                  | `file.routes.ts:196`; `drawn-signature.ts:9`                                |
| Attachments sent separately, not merged    | Shipped                                  | `dispatch-package.service.ts:112`                                           |
| QES / SwissSign                            | Deliberately removed                     | `shared/src/enums.ts:78`; removal plan 2026-06-10                           |

---

## What this audit did not cover

Puppeteer's rendered output was not inspected as a PDF, so the geometry finding is a source-level
divergence rather than a measured one. Production DNS and the Resend sending-domain verification
state are outside the repository and were not checked; the API key and `EMAIL_FROM` are present in
production config. `08-guardrails/` was read only where the product specs pointed into it.
