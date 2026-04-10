# Signatures and Attachments

> These decisions are **LOCKED**. They are not recommendations or options under review.
> See [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md) for the rationale
> and the options that were rejected.
> See [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)
> for why attachment rules remain provider-dependent.

## Signature scope — LOCKED: Option C

**Locked choice: typed name plus on-screen drawn signature.**

The user may:

1. Enter a typed name (always required as a base)
2. Choose between two signature modes:
   - **Typed** — name rendered in a classic handwritten script font (Allura)
   - **Drawn** — sign directly on screen using a canvas (finger, stylus, or mouse)

Drawn signatures are captured as PNG blobs, uploaded as file assets (`kind: "signature"`), and
embedded in both the preview and the final PDF.

**Why this changed:**

- Option B (typed + uploaded image) was the original lock
- Replaced with Option C (typed + drawn) because on-screen signing turned out to be
  high-leverage: `react-signature-canvas` wraps `signature_pad`, solving the hard parts of
  smooth canvas input in modern browsers, with negligible implementation overhead
- Image upload mode was dropped — it was never wired in production and can be added back if
  customers request it

## Attachment scope — LOCKED: Option B

**Locked choice: support a narrow, approved set of attachment types, kept separate from the
editable letter artifact.**

Locked constraints:

- Attachments are supporting documents, not layout elements inside the letter body
- The letter body may reference enclosures even if the files are not yet uploaded
- Uploaded attachments remain operationally separate from the core letter PDF artifact
- Allowed types: `application/pdf`, `image/png`, `image/jpeg`
- Size limits: see [`file-handling.md`](file-handling.md)
- Provider-side packaging of attachments is not yet locked; do not assume merged-PDF assembly or
  a provider multi-part submission shape until Swiss Post onboarding docs confirm it

**Why this is locked:**

- Option A (no attachments) was rejected as cutting important real-world use cases
- Option C (broad office-format support) was rejected due to file conversion complexity and too many
  provider unknowns for MVP

**Still open — do not guess in code:**

- Whether all dispatch provider paths support attachments equally
- Whether attachments are appended, transmitted separately, or temporarily disabled for the launch
  provider path

**Locked timing:** attachments are available only after the first draft exists and remain editable
through the review step. Checkout does not introduce new attachment upload behavior.

**Launch gate:** If the provider-confirmed launch path cannot support attachments safely, Episto
must disable attachment submission at launch rather than inventing a packaging flow.

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
