# Dictation and Speech Input

**Resolves:** GAP-2 (speech/dictation technical decision)
**Status:** Locked implementation direction. Dictation is a backend-owned product path built around
Azure AI Speech. Browser-native speech recognition is not the canonical implementation.

---

## 1. Decision

### Locked direction

- **Primary path:** same-origin microphone capture in the browser, streamed to the backend, then to
  **Azure AI Speech** for live transcription.
- **Fallback path:** buffered stop-then-transcribe through the same backend-owned speech adapter
  when the live stream fails or cannot complete cleanly.
- **Provider boundary:** the frontend never calls Azure directly. All provider interaction stays in a
  backend adapter.

### Rejected as the primary product path

- **Browser Web Speech API:** rejected because behavior, locale quality, and availability vary too
  much by browser/vendor and would make dictation non-deterministic across the product.
- **Whisper as the main live engine:** rejected for primary dictation because the product needs
  low-latency live transcription plus phrase-list/custom-speech support. Do not assume Whisper is
  the fallback either unless a later explicit decision adds it.

---

## 2. Runtime flow

1. The browser requests microphone permission and captures audio locally.
2. The frontend streams PCM audio to a same-origin backend route.
3. The backend opens a speech session against Azure AI Speech and relays partial/final transcript
   events back to the client.
4. If the live session fails after audio was captured, the frontend can submit the buffered audio to
   a backend fallback route for stop-then-transcribe.
5. Transcript text is inserted into the editable composer; the user still decides what to send.

No raw Azure payloads or browser-vendor STT assumptions should leak into UI copy or shared
contracts.

---

## 3. Responsibility split

### App-owned

- microphone UX and permission handling
- realtime transcript state (`partial` vs `final`)
- canonical vocabulary lists for important Swiss companies/institutions
- request-time hints derived from the current draft/session context
- privacy enforcement (transit-only audio, no raw audio retention)
- backend adapter boundary and normalization of provider responses

### Azure-owned

- speech recognition execution
- phrase lists / custom speech configuration
- speech resource quotas, endpoints, and regional configuration

---

## 4. Vocabulary and language behavior

- Dictation language follows the active letter locale (`de-CH`, `fr-CH`, `it-CH`, `en-CH`).
- If the user switches locale, the next dictation session must use the new locale.
- Do **not** auto-detect language during dictation.
- The app maintains a canonical vocabulary seed for important Swiss recipients and institutions.
- The backend augments that canonical list with request-time hints from the current draft context
  (recipient, sender, company, city, known references, etc.).

---

## 5. UX and failure handling

- Dictation remains first-class on mobile and available on desktop.
- States stay explicit: idle -> listening -> processing -> result/error.
- Partial transcription may appear while listening, but only editable text is committed to the
  composer.
- If microphone permission is denied, keep typing available and show a clear recovery message.
- If live transcription fails mid-session, stop the active listening UI promptly and try the
  buffered fallback when audio is available.
- Never claim success when the speech provider response is ambiguous or incomplete.

---

## 6. Privacy and security

- Raw audio is **transit-only**. Do not store raw audio in application storage, logs, or support
  tooling.
- Same-origin application responses must allow `microphone=(self)` so customer dictation surfaces
  work, while keeping other sensitive browser APIs restricted.
- Provider secrets remain server-side only.
- User-facing copy must stay truthful: we transcribe speech through our backend speech provider; we
  do not promise offline, on-device, or browser-vendor processing.

---

## 7. Accessibility and compatibility

- Dictation is an enhancement, not a requirement.
- All drafting paths must remain available via typing alone.
- Screen readers should receive recording-state announcements.
- Availability depends on browser microphone capture primitives (`getUserMedia`, audio processing,
  same-origin realtime transport), not on browser-native speech recognition support.
- Do not silently hide dictation where it is presented as a first-class affordance; if unavailable,
  show a truthful unavailable state and keep typing ready.

---

## 8. Future enhancements

- custom speech endpoint tuning once we have enough safe vocabulary data
- richer punctuation/formatting commands
- better recipient/entity hint generation from draft context
- call/voice-note scenarios only after a separate product decision
