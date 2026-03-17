# Dictation and Speech Input

**Resolves:** GAP-2 (speech/dictation technical decision)
**Status:** Directional implementation guide. Browser-native dictation is the current recommended
MVP path, but provider-specific behavior must stay behind an abstraction boundary and must not leak
into user-facing promises.

---

## 1. Speech-to-Text Decision

### Option A: Web Speech API (browser native) — RECOMMENDED for MVP
- Pros: Zero backend cost, instant availability, no audio upload (privacy), works offline on some devices, good enough for Swiss German/French/Italian
- Cons: Inconsistent across browsers (Chrome best, Safari partial, Firefox limited), no fine-tuning, accuracy varies by dialect, no server-side fallback
- Swiss language support: Chrome supports de-CH, fr-CH, it-CH via Google STT backend
- Privacy: Audio processed by browser vendor (Google for Chrome, Apple for Safari)

### Option B: Whisper API (OpenAI)
- Pros: Excellent multilingual, consistent quality, supports Swiss German well
- Cons: Audio must be sent to US servers (privacy concern), cost per minute, latency, requires microphone permission + upload
- Cost: ~$0.006 per minute

### Option C: Self-hosted Whisper / Deepgram
- Pros: Data stays under our control, customizable
- Cons: Infrastructure burden, latency, cost, overkill for MVP

**Decision status:** RECOMMENDED Option A for MVP. Browser Web Speech API with graceful degradation.
Treat this as the current design direction, not as permission to hardcode browser-vendor-specific
assumptions across the app. Keep dictation behind a dedicated frontend abstraction and keep copy
truthful about availability.

---

## 2. Implementation
- Use `window.SpeechRecognition` / `webkitSpeechRecognition`
- Language set from user's locale: `recognition.lang = 'de-CH'`
- Continuous mode: `recognition.continuous = true`
- Interim results: show real-time transcription as user speaks
- Final result: send as user message to AI conversation

---

## 3. UX Pattern
- Microphone button: prominent on mobile (bottom-right, floating, accent color)
- States: idle → listening (pulsing animation) → processing → result
- Visual feedback: waveform or pulsing indicator while recording
- Cancel: tap microphone again or swipe away
- Result: transcribed text appears in input field, user can edit before sending
- Error: "Voice input is not available in this browser. Type your message instead."

---

## 4. Language Switching
- Dictation language follows the session locale
- If user switches locale, speech recognition language switches too
- No automatic language detection (too unreliable for Swiss dialects)

---

## 5. Privacy
- Browser API: audio is processed by browser vendor, not our servers
- No audio is stored by us
- Privacy notice: "Voice input is processed by your browser. We don't store audio."
- If user declines microphone permission: show text-only mode

---

## 6. Accessibility
- Dictation is an enhancement, NOT a requirement
- All features accessible via typing
- Screen reader: announce recording state changes
- Keyboard shortcut: Ctrl+Shift+M to toggle recording (desktop)

---

## 7. Browser Compatibility
- Chrome/Edge: Full support (de-CH, fr-CH, it-CH, en-CH)
- Safari: Partial (may lack Swiss locale variants)
- Firefox: Limited (experimental, may not work)
- Fallback: keep the voice affordance discoverable but unavailable with a clear explanation; do not
  hide it silently where voice input is otherwise presented as a first-class path

---

## 8. Future Enhancements
- Whisper API integration for accuracy improvement
- Custom vocabulary for Swiss postal/legal terms
- Punctuation commands ("period", "new paragraph")
- Speaker diarization (future, for phone dictation)
