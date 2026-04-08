# Frontend Build Pack

## Goal

Make frontend implementation deterministic enough that an AI coder cannot improvise the product
shape.

## Experience quality bar

Correct flow implementation is not enough. The shipped frontend must feel materially easier than
the manual alternative of drafting, formatting, printing, and mailing a letter alone.

Non-negotiable product qualities:

- The user should always know the next best action within one glance.
- The app should ask for the minimum information needed at the current step, not exhaustively front-load work.
- Any step that feels like clerical data entry rather than guided progress should be redesigned.
- Navigation, submit actions, and critical interactions must be responsive enough to support a core-flow INP under 200 ms on target devices.
- Async states must acknowledge the action immediately and show useful progress, partial output, or truthful pending status rather than blank waiting.
- The preview/edit loop must feel direct: one interaction from intent to visible result on desktop, and at most two simple interactions on mobile.
- Repeated logic is not only a maintenance risk; it creates inconsistent UX. Centralize it.

## Async rendering rules

- Separate last committed data from pending user selections or in-flight replacements. Do not overwrite committed form state with placeholder values just to make a loading state appear.
- When one control triggers async data for a sibling or downstream surface, the dependent region must render its own pending boundary. A tiny spinner only in the initiating control is not enough.
- Do not keep showing stale success-shaped content for a newer unresolved selection. Use a status row, skeleton, disabled placeholder, or equivalent truthful pending UI until the new data resolves.
- Preserve existing content during background refresh only when it is still truthful for the same entity or query. If the pending request refers to a different entity, withhold the old dependent content.
- Pending surfaces should keep layout stable and use both visible feedback and accessibility cues such as `aria-busy` / `role="status"` where appropriate.

## UI consistency guardrails

These implementation rules are mandatory. They exist to stop visual drift when multiple engineers or AI agents touch the frontend.

- Product overlays must use the shared shadcn/Radix primitive layer in `components/ui/` (`Dialog`, `Sheet`, `Popover`, `DropdownMenu`) rather than one-off fixed-position or portal implementations.
- Product enter/exit and presence animation must use `framer-motion` when the interaction is more than a simple hover, focus, or pressed state. Tailwind/CSS transitions remain appropriate for small visual state changes.
- Mobile menus, step pickers, preview surfaces, and other temporary panels must reuse the same overlay families and spacing rules instead of inventing per-route wrappers.
- Primary workflow actions should come from shared button primitives and keep the same height, radius, typography, icon treatment, and loading behavior across steps.
- Product body copy, helper copy, and descriptive list text must not fall below 14 px on compact/mobile layouts. Avoid 10–11 px microcopy in feature UI.
- Tappable controls must respect accessibility sizing: never below WCAG's 24 × 24 px minimum, and primary isolated controls (menu triggers, CTA buttons, menu rows, icon actions) should target 44–48 px hit areas in practice.
- User-visible assistant content must always be normalized before rendering. Raw provider JSON or structured response contracts must never be shown directly in the UI.

If an interaction already exists elsewhere in the product, extend the shared component or primitive before creating a new visual pattern.

## Frontend architecture rule

Frontend implementation must be planned from the application level first, not page-by-page.
Common product behavior must live in centralized hooks, services, and shared state boundaries rather
than being reimplemented inside route components.

Required shared frontend layers:

- `hooks/useDraftSession*` for session loading, expiry, resume, and mutation orchestration
- `hooks/useDraftStream*` for the single SSE connection per active draft and normalized event fan-out
- `hooks/useDraftConversation*` for message flow, streaming state, retry, and input submission
- `hooks/useDraftPricing*` for canonical price breakdown and delivery-option effects
- `hooks/useDraftFiles*` for attachment/signature upload, validation, and state sync
- `services/api/*` for typed API access only
- `lib/i18n/*` for string resolution only; components do not embed fallback copy

Route components should compose these layers, not replace them with local bespoke logic.

Every shared hook or service should also protect UX consistency. If two screens can show the same
status, expiry warning, price breakdown, or file-validation rule, they must derive it from the same
central layer.

## Centralized Hook Definitions

These hooks are the backbone of the frontend. They encapsulate all server-state interaction, business logic, and side effects. Page components should be thin composites of these hooks — not independent implementations.

All hooks live in `frontend/src/hooks/`. All use React Query for server state and return typed results from `shared/` schemas.

### `useSession`

**File:** `hooks/use-session.ts`

**Responsibility:** Session lifecycle — creation, loading, expiry detection, resume.

```typescript
// Returns:
interface UseSessionReturn {
  session: Session | null;         // Current session from GET /api/v1/sessions/current
  isLoading: boolean;
  isExpired: boolean;              // Derived: session.expiresAt < now
  expiryWarningLevel: 'none' | 'warning' | 'critical'; // warning=<1h, critical=<5min
  createSession: (locale: Locale) => Promise<Session>;
  resumeSession: (token: string) => Promise<Session>;
}

// React Query key: queryKeys.session('current')
// Stale time: 30s (session data changes infrequently)
// Refetch: on window focus (detects expiry after tab switch)
```

### `useDraft`

**File:** `hooks/use-draft.ts`

**Responsibility:** Draft CRUD, auto-save, field updates, status tracking.

```typescript
interface UseDraftReturn {
  draft: DraftLetter | null;       // From GET /api/v1/drafts/:id
  isLoading: boolean;
  status: DraftStatus;             // From shared/enums
  updateSender: (data: SenderProfile) => Promise<void>;
  updateRecipient: (data: RecipientProfile) => Promise<void>;
  updateContent: (data: DraftContentPatch) => Promise<void>;
  createSnapshot: () => Promise<DraftSnapshot>;
  // Auto-save: PATCH with 2s debounce on content changes and baseUpdatedAt freshness marker
}

// React Query key: queryKeys.draft(draftId)
// Auto-save: useMutation with onMutate optimistic update, onError rollback
// If backend returns 409 because baseUpdatedAt is stale, surface a compact conflict banner:
// "This draft changed in another tab." Actions: reload latest, copy unsaved text.
// Invalidates: queryKeys.draft(draftId) on mutation success
```

### `useConversation`

**File:** `hooks/use-conversation.ts`

**Responsibility:** AI message flow, SSE streaming, retry logic.

```typescript
interface UseConversationReturn {
  messages: ConversationMessage[];  // From GET /api/v1/drafts/:id/messages
  isStreaming: boolean;             // True while SSE ai_token events arriving
  streamingText: string;           // Accumulated partial text during stream
  sendMessage: (content: string) => Promise<void>;
  retryLast: () => Promise<void>;
  regenerationsRemaining: number;  // 10 - used count
}

// Consumes normalized events from useDraftStream; does not open a second EventSource
// Handles: ai_token, field_update, draft_status, error events
// Fallback polling policy belongs to the shared stream layer
```

### `useDraftFiles`

**File:** `hooks/use-draft-files.ts`

**Responsibility:** Attachment and signature upload, validation, deletion.

```typescript
interface UseDraftFilesReturn {
  attachments: FileAsset[];        // kind='attachment'
  signature: FileAsset | null;     // kind='signature'
  isUploading: boolean;
  uploadProgress: number;          // 0-100
  uploadFile: (file: File, kind: 'attachment' | 'signature') => Promise<FileAsset>;
  removeFile: (fileId: string) => Promise<void>;
  validationError: string | null;  // Client-side pre-check (size, MIME)
}

// Client-side validation before upload:
//   - Check MIME type against allowed list
//   - Check file size against MAX_ATTACHMENT_FILE_BYTES / MAX_SIGNATURE_FILE_BYTES
//   - Check total upload against MAX_TOTAL_UPLOAD_BYTES
//   - Check attachment count against MAX_ATTACHMENTS_PER_DRAFT
// Limits come from a shared config object (not hardcoded)
```

### `useCheckout`

**File:** `hooks/use-checkout.ts`

**Responsibility:** Price display, Stripe Elements payment, payment state.

```typescript
interface UseCheckoutReturn {
  pricing: PricingBreakdown | null; // Derived from snapshot via POST /api/v1/drafts/:id/review
  paymentState: PaymentState | null; // From GET /api/v1/drafts/:id/payment; null before checkout
  clientSecret: string | null;       // From POST /api/v1/drafts/:id/checkout
  createPaymentIntent: (email: string) => Promise<void>; // Creates intent, sets clientSecret
  isProcessing: boolean;
}

// React Query key: queryKeys.payment(draftId)
// Uses Stripe Elements (embedded <PaymentElement>), NOT Stripe Checkout (hosted page).
// This matches page-specifications.md §8 which describes an embedded payment form with TWINT.
// Flow: POST checkout → get clientSecret → render <PaymentElement> → user pays → webhook → poll
// Use @stripe/react-stripe-js: <Elements options={{ clientSecret }}><PaymentElement /></Elements>
// Never cache payment state beyond 0 stale time — always fresh from server
```

### `useDispatchStatus`

**File:** `hooks/use-dispatch-status.ts`

**Responsibility:** Post-payment dispatch tracking via SSE.

```typescript
interface UseDispatchStatusReturn {
  dispatchState: DispatchState;     // From shared/enums
  providerReference: string | null;
  isTrackable: boolean;            // True only if provider supports tracking for this ref
  events: DispatchEvent[];         // Timeline events
}

// Consumes dispatch_status events from useDraftStream
// Never show 'delivered' unless backend confirms it
// Never label a reference as 'tracking' unless isTrackable is true
```

### `useDictation`

**File:** `hooks/use-dictation.ts`

**Responsibility:** Web Speech API wrapper with locale support.

```typescript
interface UseDictationReturn {
  isSupported: boolean;            // Feature detection
  isRecording: boolean;
  interimText: string;             // Partial recognition result
  finalText: string;               // Committed recognition result
  startRecording: (locale: Locale) => void;
  stopRecording: () => void;
  error: DictationError | null;    // permission_denied | no_speech | network | not_supported
}

// Uses window.webkitSpeechRecognition || window.SpeechRecognition
// continuous=true, interimResults=true
// Language set from active locale (de-CH, fr-CH, it-CH, en-CH)
// Graceful degradation: if not supported, isSupported=false and the UI shows a clear unavailable message
```

### `useLetterPreview`

**File:** `hooks/use-letter-preview.ts`

**Responsibility:** Preview state derived from draft data, rendered client-side using the shared
letter template component.

```typescript
interface UseLetterPreviewReturn {
  previewData: LetterPreviewData | null; // From GET /api/v1/drafts/:id/preview (structured JSON)
  estimatedPageCount: number;
  isStale: boolean;                      // True when draft has changed since last preview fetch
  refreshPreview: () => void;            // Invalidate and re-fetch
}

// GET /api/v1/drafts/:id/preview returns structured data (sender, recipient, subject, body, etc.)
// The frontend renders this into the A4 template using a shared <LetterPreviewRenderer> component.
// The same template logic is used by Puppeteer for final PDF — divergence = bug.
// Listens for field_update SSE events to mark preview as stale.
// Page count is estimated client-side from content length; exact count comes after backend render.
```

## Route and view map

| Route | Purpose |
|---|---|
| `/` | Marketing homepage |
| `/draft/new` | Draft entry and session bootstrap |
| `/draft/:id` | Guided drafting workspace |
| `/draft/:id/review` | Final review and delivery selection |
| `/draft/:id/checkout` | Payment |
| `/draft/:id/confirmation` | Dispatch result and reference display |
| `/resume/:token` | Guest resume path for unpaid/editable drafts |
| `/status/:orderToken` | Paid-order status, receipt, and final artifact access |
| `/{locale}/admin/*` | Internal admin UI only — see [`admin-build-pack.md`](admin-build-pack.md) |

## Main screen composition for `/draft/:id`

- Conversation panel (left/primary on desktop; full-width primary on mobile)
- Live preview panel (right/secondary on desktop; toggleable on mobile)
- Field-completion status strip
- Attachment and signature controls
- Save/resume affordances where the session model allows

## Core frontend components

| Component | Location | Purpose |
|---|---|---|
| `DraftWorkspace` | `components/product/` | Root workspace layout |
| `ConversationPanel` | `components/product/` | Guided prompts and follow-up |
| `LetterPreview` | `components/product/` | Live document preview |
| `ZoneEditor` | `components/product/` | Direct zone editing after first draft |
| `DeliverySelector` | `components/product/` | Standard vs registered choice |
| `PriceSummary` | `components/product/` | Checkout price display |
| `AttachmentUploader` | `components/product/` | File upload with limits from `file-handling.md` |
| `SignaturePicker` | `components/product/` | Typed + image upload per `signatures-and-attachments.md` |
| `DispatchConfirmation` | `components/product/` | Post-dispatch reference display |

See [`../03-ux/page-specifications.md`](../03-ux/page-specifications.md) for per-screen specs and
[`../03-ux/mobile-patterns.md`](../03-ux/mobile-patterns.md) for responsive behavior.

## Frontend state rules

- Use shared schemas from `shared/` for canonical data shapes — never duplicate by hand
- Keep optimistic UI narrow and reversible
- Never show a provider success state before backend confirmation arrives
- Never fabricate tracking visibility
- All user-visible status strings come from canonical backend states, never hardcoded UI strings
- Centralize business logic in reusable hooks/selectors; avoid repeating request, transform, and state-transition code across screens
- No route may depend on placeholder data, fake loading completions, or stubbed action handlers

## Implementation planning

Before building a major frontend area, define:

- route responsibilities
- hook responsibilities
- shared component boundaries
- mutation/query ownership
- error and empty states
- mobile vs desktop behavior

If these are not explicit first, the frontend will drift into duplicated logic.

## Localization

All user-facing strings must go through the i18n layer. No hardcoded copy in components. Target
locales: `de-CH`, `fr-CH`, `it-CH`, `en-CH`.

## Mobile behavior

- Preview and conversation toggle on small screens (single active panel)
- Review step must stay fully readable and actionable on a phone
- Payment and confirmation screens must not depend on hover states or desktop-only affordances
- Primary actions reachable with one hand

## Cross-references

- Component primitives: `components/ui/` (shadcn-derived only)
- Product components: `components/product/`
- Marketing components: `components/marketing/`
- Shared types: `shared/`
- Session design: [`../05-architecture/session-management.md`](../05-architecture/session-management.md)
- File limits: [`../04-product/file-handling.md`](../04-product/file-handling.md)
