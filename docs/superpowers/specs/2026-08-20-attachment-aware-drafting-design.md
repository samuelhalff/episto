# Attachment-aware drafting — design

Date: 2026-08-20
Status: approved scope, implementing
Inputs: founder request ("attachment logic should help users who refer to attachments in the letter"), independent Codex plan, Codex UX pass, Fable plan; synthesized.

## Problem

Attachments are extracted and injected into AI prompts as reference text, and mailed
PDFs are physically enclosed via ePost — but the two facts never meet:

- The drafting AI does not know which files will be physically enclosed (PDFs) vs
  drafting-context only (images). It can neither say "beiliegend" confidently nor is
  it prevented from claiming an image is enclosed.
- Users are never told which files get mailed. The uploader chips only cover
  readability.
- The letter's `enclosureNote` ("Beilage: …") is a manual field on the review page
  that users rarely fill, so letters ship without the conventional Swiss enclosures
  line even when evidence is enclosed.
- Attachments added/removed after the body was drafted never update the body
  (attachments step is 05, body is 04) — silent staleness.

## Decided scope (this increment)

1. **Attachment manifest + mailability-aware prompts** (backend).
   `buildAttachmentContextBlockFromDocs` gains per-document metadata: filename,
   readability, and `mailing: enclosed | context-only` (PDF ⇒ enclosed, image ⇒
   context-only, mirroring provider policy). Block instructions + `drafting.ts`
   rules: refer to enclosed documents naturally where they support the argument
   ("Ich lege … bei"), NEVER claim context-only or unreadable files are enclosed;
   phrase image facts as "Aufgrund des bereitgestellten Fotos …".
2. **Deadline nudge, prompt-only** (backend). Intake prompt: when an attached
   document states an explicit response deadline, surface it conversationally with
   "possible deadline — please verify" framing and ask whether to mention it in the
   letter. No schema change, no dedicated UI in this increment.
3. **Mailability chips in the uploader** (frontend). Each file row gets a mailability
   chip before the readability chip: PDFs "Mailed with letter" / "Wird mitgeschickt";
   images "Assistant only" / "Nur für Assistenz" (+ fr/it). Helper copy explains
   images still help the assistant. No OCR/MIME jargon.
4. **Enclosure-note suggestion on review** (frontend). When mailed PDFs exist and
   `enclosureNote` is empty, an inline suggestion card (not a modal) under the letter
   preview offers "Enclosure: {fileNames}" with Add / Edit / No thanks. Helper:
   "This text appears on the letter. It does not change which files are mailed."
   Decline is remembered per draft (no nagging). Saves via the normal draft update.
5. **Stale-body banner** (frontend). When the attachment set changes after the last
   AI compose/refine, the body step shows a quiet banner: "Documents changed — Your
   draft was written before these files changed." Primary "Update draft" sends one
   canned refinement instruction through the existing refinement thread; secondary
   "Keep wording" dismisses for that attachment-change batch. Client-side tracking:
   the attachment id set is recorded at compose/refine completion (workspace state +
   sessionStorage); no backend field in v1.

## Explicitly deferred

- Step reorder (attachments before body): high churn, low marginal value now that
  intake upload + chips + stale-body banner exist.
- Deadline extraction schema + intake quick-actions + logistics registered-mail
  nudge: follow-up increment (UX already specced in the Codex UX pass, keep it).
- Auto-generated render-time Beilagen block: rejected in favour of the editable
  `enclosureNote` prefill — anything printed must stay user-visible and editable.
- Multi-PDF enclosures, image→PDF conversion, document Q&A, "reply-first" entry
  funnel.

## UX guardrails (from the UX pass)

- Progressive disclosure: chips at upload, suggestion at review, banner only when a
  real mismatch exists. No toast per attachment change; never block a step.
- Warning fatigue: stale-body banner shows once per change batch; "Keep wording"
  is remembered.
- Trust: deadline mentions always "possible … please check yourself"; enclosure
  card never implies declining affects what is mailed.

## Technical touchpoints

- backend/src/modules/files/attachment-ingestion.service.ts — manifest lines in
  `buildAttachmentContextBlockFromDocs` (mailing status from mimeType).
- backend/src/modules/ai/prompts/drafting.ts, intake.ts — enclosure-reference rules,
  deadline nudge.
- frontend/src/components/product/attachment-extraction.ts + AttachmentUploader.tsx —
  mailability chip helper + render; `files.*` i18n namespace, 4 locales.
- frontend/src/components/product/review/ReviewPageReady.tsx — suggestion card;
  `useUpdateDraft` save; per-draft dismissal in sessionStorage.
- frontend/src/components/product/draft-flow/useBodyStepController.ts + BodyStep.tsx —
  attachment-set fingerprint at compose/refine completion, banner state, canned
  refinement via existing `sendRefinementInstruction` path.

## Testing

- Backend: unit tests for manifest content per mime/status combination; prompt
  assertions (enclosure rules present, never-enclose-images rule); existing
  ai-handler tests stay green.
- Frontend: chip mapping tests (attachment-extraction), review suggestion card
  contract test, stale-banner state test; all four locale files carry the new keys.

## Risks

- Overclaiming enclosures → prompt rules + manifest, tested.
- OCR misreads → unchanged "candidate facts, verify at review" stance; deadline
  wording always hedged.
- Conversion friction → all new surfaces are non-blocking and dismissible.
