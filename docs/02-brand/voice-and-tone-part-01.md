# Voice and tone — Part 1

> Split from [voice-and-tone.md](voice-and-tone.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 1. Brand voice attributes
- 2. Tone spectrum
- 3. Writing rules
- 4. UI copy patterns with examples
- 5. Multilingual considerations
- 6. Error message framework

## 1. Brand voice attributes

episto is a competent friend who handles your paperwork — not a bank, not a chatbot, not a government portal. The voice is consistent across all surfaces; only the tone shifts to fit context.

### Clear

Say exactly what is happening. No jargon, no vague abstractions, no mystery.

| ✅ Do                                        | ❌ Don't                                      |
| -------------------------------------------- | --------------------------------------------- |
| "Your letter is ready to review."            | "Your document has been processed."           |
| "Enter the recipient's full postal address." | "Provide destination information."            |
| "Payment failed. No letter was submitted."   | "There was an issue completing your request." |
| "We don't have a delivery confirmation yet." | "Status: pending" (with no context)           |

### Confident

We know what we're doing. Assertive, not arrogant. We don't hedge unnecessarily, and we don't over-promise.

| ✅ Do                                                                                         | ❌ Don't                                            |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| "Your letter will be prepared and submitted for delivery in Switzerland."                     | "We'll try to get your letter sent soon."           |
| "Registered mail gives you a signed proof of receipt."                                        | "Registered mail might provide some kind of proof." |
| `"CHF {price} for standard delivery."` _(use actual config value — see pricing-structure.md)_ | "Pricing may vary — please check."                  |

> **Implementation note:** All CHF amounts in examples throughout this document are illustrative
> format examples only. The current launch prices are locked in
> `docs/04-product/pricing-structure.md`, but copy in this file must still read from pricing config
> rather than hardcoded values.

### Warm

Human and approachable, but not performatively friendly. We are not a mascot, not a cheerleader, not a customer service script.

| ✅ Do                                                                 | ❌ Don't                                                 |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| "Not sure what to write? Describe your situation and we'll draft it." | "Hi there! 👋 Let's craft your amazing letter together!" |
| "Take your time — your draft is saved automatically."                 | "Awesome! You're doing great!"                           |
| "Something went wrong on our end. We're looking into it."             | "Uh oh! Looks like we hit a snag 😬"                     |

### Swiss

Precision, reliability, and quality are built into everything. We respect the user's time. We do not over-design interactions. We do not use filler.

| ✅ Do                                                        | ❌ Don't                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| "Delivered to Swiss addresses through our dispatch partner." | "Fast, reliable delivery across the whole of Switzerland!" |
| "A4, black and white, single-sided."                         | "Professional, high-quality printing options available."   |
| "Reference: 9876543210123456"                                | "Your tracking number has been assigned ✓"                 |

### Honest

If something failed, is unknown, or is ambiguous — say so directly. We never dress up uncertainty as success.

| ✅ Do                                                                             | ❌ Don't                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------ |
| "We've submitted your letter. Dispatch confirmation is pending."                  | "Your letter has been sent!"                     |
| "We can't confirm delivery for standard mail."                                    | "Your letter is on its way!"                     |
| "We couldn't generate a draft. Please try describing your situation differently." | "Almost there — one more moment…" (then failure) |

---

## 2. Tone spectrum

Same voice, different tone. The core attributes never change — but warmth, formality, and energy shift depending on where the user is and what they need.

### Marketing / homepage

**Tone:** Inspiring, aspirational, benefits-focused. Speak to the outcome, not the feature.

> "Your letter, written and posted — without the trip to the post office."
> "Finally send the letter you've been putting off."
> "Formal letters, handled. In minutes."

Do not use hollow superlatives ("best", "fastest", "most powerful"). Let the benefit speak.
Do not market the product as "AI-powered" in headlines, badges, or hero copy. Follow the Google
Maps rule: the capability stays in the background, the result stays in the foreground.

### Onboarding / empty states

**Tone:** Encouraging, helpful, low-pressure. The user is new or starting fresh — meet them there without rushing.

> "Start by describing what you need to say. You can write it yourself or let us draft it."
> "No letters yet. When you send one, it'll appear here."
> "Your saved details will appear here once you've sent a letter."

Do not use pressure language ("Get started now!") or make empty feel like failure.

### Drafting workspace

**Tone:** Focused, minimal, gets out of the way. The user is working — the UI should recede. Copy is sparse and purposeful.

> "Recipient" (label — not "Who are you sending to?")
> "Saving…" (status — not "Hang on, we're saving your progress!")
> "Draft ready. Review and edit before sending." (notice — not a celebration)

Avoid over-explaining features in the workspace. Contextual help belongs in tooltips or help overlays, not inline labels.

### Error states

**Tone:** Empathetic, specific, action-oriented. Something broke — the user needs to know what and what to do next. Do not be cheerful. Do not be apologetic to the point of uselessness.

> "Your session expired. Start a new letter or sign in to recover a saved draft."
> "The file you uploaded is too large. Maximum size is 10 MB."
> "We couldn't render your letter. Try again, or contact support if the problem continues."

Always answer: what failed? What can the user do now?

### Payment / checkout

**Tone:** Reassuring, transparent, no surprises. Users are about to spend money — give them full clarity on what they're paying for and what happens next.

> "CHF {formattedPrice} for standard delivery. Includes printing, postage, and same-day submission." _(price from config — this is a tone example, not a hardcoded amount)_
> "Payment is processed by Stripe. episto does not store your card details."
> "Once payment succeeds, your letter is submitted for dispatch. You'll receive a confirmation."

No dark patterns. No upsells disguised as defaults. No vague "fees may apply."

### Confirmation / success

**Tone:** Calm and clear, with measured celebration where earned. Don't oversell the moment; just confirm what happened and tell the user what's next.

> "Letter submitted. We'll post it today."
> "Your letter is in the queue for dispatch."
> "Reference saved. Check back here for updates when tracking is available."

Reserve exclamation marks for genuine milestones ("Letter sent!" on the first ever send is fine). Do not use them routinely.

### Admin / support

**Tone:** Precise, neutral, fact-based. Internal tools and support views are read by people diagnosing problems — prioritise accuracy over warmth.

> "Dispatch status: submitted — awaiting provider confirmation"
> "Payment: succeeded | Dispatch: rejected | Action: refund pending"
> "File uploaded 14.03.2026 15:42 UTC — size: 2.3 MB — type: application/pdf"

Use canonical state names from the system contracts. Do not paraphrase them for friendliness.

---

## 3. Writing rules

### Sentence case

Use sentence case everywhere in the UI — headings, buttons, labels, messages.

> ✅ "Review your letter"  
> ❌ "Review Your Letter"

Exception: proper nouns (Swiss Post, Stripe, episto).

### Active voice

Prefer active constructions. Use passive only when the subject is unknown or irrelevant.

> ✅ "We submitted your letter to our dispatch partner."  
> ❌ "Your letter has been submitted."

> ✅ "Your file exceeded the size limit."  
> ❌ "The size limit was exceeded."

### Addressing users

Use "you/your" directly. Never "the user", never third-person references to the person reading.

> ✅ "Your draft is saved."  
> ❌ "The user's draft has been saved."

### Numbers and currency

- Use digits for prices, counts, sizes, and measurements: "3 pages", "CHF 6.90", "10 MB"
- Spell out "one" and "two" in prose sentences: "We sent you one confirmation email."
- Currency is always formatted like `CHF 6.90` — never "Fr.", "SFr.", "sfr", or bare numbers for prices
- Do not use CHF without the amount: "CHF" alone is not a price

### Dates

- Default format for Swiss context: `DD.MM.YYYY` (e.g. `14.03.2026`)
- Use locale-aware formatting via the i18n layer — never hardcode date strings in components
- Prefer relative time when recency matters and the context is clear: "Submitted today at 15:42"

### Words to avoid

| Avoid                         | Why                                             |
| ----------------------------- | ----------------------------------------------- |
| "just"                        | Dismisses the user's effort ("just click here") |
| "simply"                      | Same as "just"                                  |
| "easy"                        | Same as "just"; also sets a false expectation   |
| "please" in errors            | Sounds like begging; weakens authority          |
| "sorry" in automated messages | Reserve for genuine human apologies in support  |
| "Oops!"                       | Cutesy; undermines trust                        |
| "Something went wrong"        | Useless without specifics                       |
| "Act now" / "Limited time"    | False urgency; out of character                 |
| API, webhook, queue, retry    | Technical jargon invisible to users             |

### Exclamation marks

Reserve for genuine, earned celebration — a first letter sent, a milestone reached. Do not use routinely. One per screen maximum, only if the moment is genuinely positive.

---

## 4. UI copy patterns with examples

### Page titles

The title tells the user where they are and what they're doing. Short, purposeful, sentence case.

```
Draft your letter
Review your letter
Choose delivery
Payment
Letter submitted
Your letters
```

### Button labels

Buttons describe the action that will happen — not "OK", not "Submit", not "Continue". Use verb + object.

```
Send letter
Save draft
Add recipient
Review draft
Pay {formattedTotal}     ← use actual config-sourced total, never hardcoded
Try again
Contact support
Download PDF
```

Destructive buttons name the destruction: "Delete draft", not "Confirm".

### Empty states

Explain why it is empty and what the user can do. Do not just say "No items."

```
No letters yet
Send your first letter to see it here.
[Send a letter]

No attachments
Add a document to include with your letter (optional).
[Add attachment]

No tracking available
This delivery type doesn't include tracking. Keep your reference number for enquiries.
```

### Form labels

Labels are nouns or short noun phrases. They identify the field — they do not instruct.

```
Full name
Company (optional)
Street address
Postcode
Town / city
Subject line
```

Avoid restating the field type in the label: "Email address", not "Enter your email address".

Placeholder text supplements — it never replaces — the label.

### Validation errors

Inline, below the field. Specific to the problem. No "please", no blame.

```
Full name is required.
Postcode must be 4 digits.
This email address doesn't look right — check for typos.
File must be PDF, JPEG, or PNG.
File is too large. Maximum size is 10 MB.
```

### Loading states

Name what is happening, not just that something is happening.

```
Generating draft…
Uploading file…
Processing payment…
Submitting letter…
Loading your letters…
```

Avoid: "Loading…" alone when a more specific label is possible.

### Success messages

Confirm what happened and tell the user what is next.

```
Draft saved.
File uploaded.
Payment complete. Your letter is being submitted.
Letter submitted. We'll post it today.
Draft deleted.
```

Do not conflate steps: payment success ≠ dispatch success. Say what specifically succeeded.

### Error messages

What failed. Why (if known and useful). What the user can do.

```
Upload failed. The file may be corrupted or in an unsupported format. Try a different file.
Payment was not completed. Your letter has not been submitted. Check your card details and try again.
We couldn't generate a draft right now. Try again in a moment, or write your letter manually.
Your session expired. Start a new letter or sign in to continue a saved draft.
```

### Confirmation dialogs

State what is about to happen. Mention reversibility if relevant.

```
Delete this draft?
This can't be undone.
[Delete draft] [Keep draft]

Remove this attachment?
Your letter will still be sent without it.
[Remove] [Cancel]
```

The primary action button names the action. The cancel button says "Cancel" — not "No, go back", not "Keep".

### Tooltips

Brief supplementary context. Should be skippable — if the information is critical, put it inline.

```
Registered mail
Includes a signed proof of receipt from the recipient.

Reference number
Provided by the dispatch provider when available. Do not imply live tracking unless tracking is actually supported.

Subject line
Appears at the top of your printed letter.
```

### Progress indicators

Tell the user where they are in the flow and how many steps remain.

```
Step 1 of 4 — Compose
Step 2 of 4 — Review
Step 3 of 4 — Delivery options
Step 4 of 4 — Payment
```

Alternatively, label the current step without numbered steps when the flow is short and linear.

---

## 5. Multilingual considerations

episto targets four Swiss locales: `de-CH`, `fr-CH`, `it-CH`, `en-CH`.

### Infrastructure rules

- All user-facing strings belong in the i18n message layer. No hardcoded copy in components.
- English (`en-CH`) is the development language. All string keys are written in English first.
- Translations are separate work, reviewed by human translators, not shipped as machine output.
- If a locale is not ready, show approved fallback copy or hide the locale — never show raw keys or machine-invented text.

### AI-generated letter content vs UI copy

These are separate concerns with separate pipelines:

| UI copy                       | AI-generated letter content          |
| ----------------------------- | ------------------------------------ |
| Translated once, used forever | Generated per request, personalised  |
| Lives in message catalogue    | Lives in draft content               |
| Human-reviewed translations   | Separate prompt and locale logic     |
| Consistency is the goal       | Fluency and tone-matching per locale |

Never mix them. Never use a letter-generation prompt to produce UI strings.

### Locale formality norms

These are guidelines — translators have final authority:

- **de-CH**: More formal by default. Use "Sie" (formal you) for all user address. Avoid contractions.
- **fr-CH**: Elegant and precise. "Vous" throughout. Avoid anglicisms.
- **it-CH**: Respectful register. "Lei" in formal contexts. Swiss Italian differs from Italian Italian.
- **en-CH**: Neutral international English. Slightly more formal than US English conventions.

Adjust example strings in translation briefs to match these norms, rather than attempting direct translation from English idiom.

### Date and currency formatting

Pass all dates and currency values through the i18n formatter — never format them in component logic.

```
// ✅ Correct — locale-aware
formatDate(date, locale)   // → "14.03.2026" for de-CH, "14.03.2026" for fr-CH
formatCurrency(690, locale) // → "CHF 6.90" always (CHF does not change)
```

---

## 6. Error message framework

Each error family has a template pattern. Use it as the structural starting point — fill in the specific context.

### validation

**Pattern:** `[Field or section] [specific problem]. [How to fix it.]`

```
Postcode must be 4 digits.
Recipient's full name is required.
The file you attached is not a supported format. Use PDF, JPEG, or PNG.
```

### policy_refusal

**Pattern:** `We can't [action] for this [reason]. [What the user can do instead, if applicable.]`

```
We can't send letters to addresses outside Switzerland at this time.
We can't process this letter. The content may not comply with our usage policy. Contact support if you think this is an error.
```

### payment_failure

**Pattern:** `Payment was not completed. [Specific reason if known.] Your letter has not been submitted. [Next step.]`

```
Payment was not completed. Check your card details and try again.
Payment was declined by your bank. No charge was made. Contact your bank or try a different card.
```

### dispatch_rejection

**Pattern:** `Your payment succeeded, but we couldn't submit your letter to the postal provider. [What we're doing about it.]`

```
Your payment succeeded, but dispatch was rejected. We're investigating and will contact you. No action needed.
Your payment succeeded, but the postal provider refused the submission. A refund will be issued automatically.
```

### dispatch_ambiguity

**Pattern:** `We submitted your letter, but we haven't received confirmation yet. [What the user should expect.]`

```
We submitted your letter, but confirmation from the postal provider is still pending. We'll update your status when we have it.
Dispatch status is unclear. We're checking with the provider. This usually resolves within a few hours.
```

### provider_outage

**Pattern:** `episto's postal service is temporarily unavailable. [What the user should do.]`

```
We can't submit letters right now due to a provider issue. Your draft is saved — try again in a few minutes.
The postal service is temporarily unavailable. We'll keep your draft ready. No payment has been taken.
```

### tracking_unavailable

**Pattern:** `A reference exists for your letter, but tracking is not available [reason]. [What the user can use instead.]`

```
A provider reference exists, but live tracking is not available for standard mail. Keep your reference number for enquiries.
Tracking details are not yet available. Check back later or contact support with your reference number.
```

### file_upload_failure

**Pattern:** `[File name or type] couldn't be uploaded. [Reason if known.] [What to try.] `

```
Upload failed. The file may be corrupted. Try a different file.
Upload failed. Your connection may have dropped. Check your internet connection and try again.
```

### rendering_failure

**Pattern:** `We couldn't prepare your letter for printing. [What to do.]`

```
We couldn't generate a PDF from your letter. Try again, or contact support if the problem continues.
Letter rendering failed. Your draft is saved — try again in a moment.
```

### retention_cleanup_failure

This error is not shown to end users. It is logged for admin review only. Do not expose it in the UI.

---
