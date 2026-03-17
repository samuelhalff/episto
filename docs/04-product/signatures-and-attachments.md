# Signatures and Attachments

> These decisions are **LOCKED**. They are not recommendations or options under review.
> See [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md) for the rationale
> and the options that were rejected.

## Signature scope — LOCKED: Option B

**Locked choice: typed name plus uploaded signature image.**

The user may:
1. Enter a typed name (always required)
2. Optionally upload an image of their handwritten signature (PNG or JPEG, max 2 MB)

The uploaded image is stored as a separate asset, normalized before rendering, and placed in the
signature zone of the final page.

**Why this is locked:**
- Option A (typed only) was rejected as too weak for the perceived trust level of formal letters
- Option C (typed + upload + drawn) was rejected as too complex for MVP; a drawing subsystem adds
  cross-device risk and implementation overhead without proportionate value

## Attachment scope — LOCKED: Option B

**Locked choice: support a narrow, approved set of attachment types, kept separate from the letter
artifact.**

Locked constraints:
- Attachments are supporting documents, not layout elements inside the letter body
- The letter body may reference enclosures even if the files are not yet uploaded
- Uploaded attachments remain operationally separate from the core letter PDF artifact
- Allowed types: `application/pdf`, `image/png`, `image/jpeg`
- Size limits: see [`file-handling.md`](file-handling.md)

**Why this is locked:**
- Option A (no attachments) was rejected as cutting important real-world use cases
- Option C (broad office-format support) was rejected due to file conversion complexity and too many
  provider unknowns for MVP

**Still open — do not guess in code:**
- Whether all dispatch provider paths support attachments equally

**Locked timing:** attachments are available only after the first draft exists and remain editable
through the review step. Checkout does not introduce new attachment upload behavior.

## Account scope — LOCKED: Option B

**Locked choice: guest-first launch with an optional save-details path for later.**

At launch:
- Users can draft, pay, and send as a guest — no account required at any step
- Guest data still requires transactional references and must be supportable
- Account features must not become hidden prerequisites for the guest flow

Future (not MVP):
- Saved sender details
- Saved recipients
- Limited dispatch history
- Multi-device resume

**Why this is locked:**
- Option A (guest-only with no future account path) was rejected as too weak for repeat use
- Option C (explicit account product at launch) was rejected as adding auth complexity too early,
  conflicting with the simplicity goals of the MVP

## Guest vs account rules

- Guest can draft, pay, and send without any account
- Guest still gets a transactional reference and can receive a confirmation email
- Account features must be additive — they must not degrade the guest experience when absent
