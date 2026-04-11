# Voice and tone — Part 2

> Split from [voice-and-tone.md](voice-and-tone.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 7. Anti-patterns — things we never say

## 7. Anti-patterns — things we never say

### Cutesy error language

```
❌ "Oops!"
❌ "Uh oh!"
❌ "Whoops, something broke!"
❌ "Hmm, that didn't work…"
```

Error is not a personality opportunity. Be direct.

### Vague failure

```
❌ "Something went wrong."
❌ "An error occurred."
❌ "We encountered a problem."
```

Always say what went wrong. "Something went wrong" is the error message of last resort — it should be logged as a gap and replaced with specifics as soon as possible.

### False delivery certainty

```
❌ "Your letter has been sent!"   (when we mean: submitted to provider)
❌ "Delivered!"                   (when we cannot confirm delivery)
❌ "On its way!"                  (when postal status is unknown)
```

Use the canonical dispatch state honestly: `queued → submitted → accepted → rejected/unknown/reconciled`. "In transit" and "Delivered" are provider-dependent labels that may not be available — do not invent them. Collapse nothing, and do not upgrade `accepted` to `delivered`.

### Technical jargon

```
❌ "API error"
❌ "Webhook failed"
❌ "Queue processing"
❌ "Retry limit exceeded"
❌ "503 Service Unavailable"
```

Map these to canonical user-facing error families (§6). Raw codes go to logs and admin tools only.

### Blame language

```
❌ "You entered an invalid postcode."
❌ "You must complete all required fields."
❌ "Your file is too large."
```

Reframe without accusation:

```
✅ "Postcode must be 4 digits."
✅ "Some required fields are incomplete."
✅ "File is too large. Maximum size is 10 MB."
```

### False urgency or pressure

```
❌ "Act now!"
❌ "Limited time offer!"
❌ "Don't miss out!"
❌ "Send before midnight!"
```

Episto does not manufacture urgency. If there is a real time constraint (e.g. same-day posting cutoff), state it factually: "Same-day posting requires submission before 16:00."

### Sycophantic affirmations

```
❌ "Great choice!"
❌ "Excellent!"
❌ "Perfect!"
❌ "You're all set!" (when there are still steps)
```

Acknowledge the action, not the user's judgement. "Draft saved." is better than "Great, your draft has been saved!"

---

_Last updated: March 2026. This document is owned by the product team. Changes require review by a product designer or lead._
