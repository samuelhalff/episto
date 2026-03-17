# Frontend Architecture

**Status:** Authoritative reference  
**Resolves:** GAP-12 (frontend state management decisions)  
**See also:** `docs/05-architecture/stack-decisions.md`, `docs/05-architecture/system-contracts.md`

---

## 1. Locked Stack

| Layer | Technology | Status |
|---|---|---|
| Framework | Next.js + TypeScript | **Locked** |
| Styling | Tailwind CSS | **Locked** |
| UI primitives | shadcn/ui | **Locked** |
| Routing | Next.js App Router | **Locked** |
| Server state | React Query (TanStack Query v5) | **Locked** |
| Form state | React Hook Form + Zod resolvers | **Locked** |
| UI state | React `useState` / `useReducer` | **Locked** |
| Global store | None — not used for MVP | **Locked** |
| API client | Typed `fetch` wrapper from `shared/` | **Locked** |

---

## 2. State Management — resolves GAP-12

### 2.1 Server state: React Query (TanStack Query v5) — LOCKED

All data that lives on the server (drafts, sessions, payment status, dispatch status) is managed via React Query.

**Rules:**
- Query keys are centralized in a `shared/query-keys.ts` file — never inline strings
- Cache invalidation is explicit after mutations — never rely on automatic refetching for payment/dispatch state
- Payment and dispatch status are never cached beyond their stale time; they must reflect backend truth
- Do not use React Query for form state — that is React Hook Form's domain
- Real-time draft events must flow through a single shared SSE connection per active draft, not through multiple competing `EventSource` instances

```typescript
// Example query key structure
export const queryKeys = {
  session: (id: string) => ['sessions', id] as const,
  draft:   (id: string) => ['drafts', id] as const,
  payment: (draftId: string) => ['payments', draftId] as const,
  dispatch: (draftId: string) => ['dispatch', draftId] as const,
} as const;
```

### 2.2 Form state: React Hook Form + Zod resolvers — LOCKED

All user-input forms (sender details, recipient details, letter fields) use React Hook Form with Zod schemas from `shared/` as resolvers.

**Rules:**
- Zod schemas in `shared/` are the single source of truth for validation — no duplicate manual validation
- Form schemas import from `shared/schemas.ts`, not redefined in components
- Client-side validation is UX-only; backend always re-validates

```typescript
// Example: reuse shared Zod schema in form
import { senderProfileSchema } from '@swiss-mail/shared/schemas';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(senderProfileSchema),
});
```

### 2.3 UI state: React useState / useReducer — LOCKED

Local UI concerns (modal open/close, accordion expansion, step progress) use `useState` or `useReducer`.

**Rules:**
- No Redux, Zustand, Jotai, or any global store for MVP
- If a state value needs to be shared across more than two non-adjacent components, consider lifting to a page-level component or React Context — not a global store
- Draft content truth always comes from backend via React Query, never from local UI state

### 2.4 API client — LOCKED

A typed `fetch` wrapper with endpoint functions defined against shared contract types.

```typescript
// shared/api-client.ts — example structure
export const apiClient = {
  drafts: {
    get:    (id: string) => typedFetch<DraftLetter>(`/api/drafts/${id}`),
    patch:  (id: string, data: PatchDraftBody) => typedFetch<DraftLetter>(`/api/drafts/${id}`, { method: 'PATCH', body: data }),
    render: (id: string) => typedFetch<RenderResult>(`/api/drafts/${id}/render`, { method: 'POST' }),
  },
  // ...
};
```

**Rules:**
- No raw `fetch` calls in components — always use the typed API client
- API client functions return typed responses matching `shared/` contract types
- Error responses are mapped to canonical error types before reaching components

---

## 3. Component Organization

```
frontend/
  src/
    components/
      ui/            ← shadcn-derived primitives ONLY
                        (Button, Input, Card, Dialog, etc.)
                        Do not add product logic here.
      product/       ← Swiss Mail product flows
                        (DraftWorkspace, LetterPreview, CheckoutForm,
                         ConfirmationScreen, DeliverySelector, etc.)
      marketing/     ← Homepage and acquisition
                        (HeroSection, TrustBlock, UseCaseCard, PricingCard, etc.)
    app/             ← Next.js App Router pages and layouts
    hooks/           ← Custom React hooks (useSession, useDraft, usePayment, etc.)
    lib/             ← Utility functions, API client, query keys
```

**Rules:**
- `components/ui/` contains only shadcn primitives. Product logic does not belong here.
- `components/product/` contains all actual Swiss Mail UX — drafting, preview, checkout, confirmation.
- `components/marketing/` contains acquisition and trust content — no drafting logic.
- No cross-contamination between these three layers.

---

## 4. Routing Strategy (Next.js App Router)

**Locale routing is locked to URL-based `/[locale]/...`** (see `docs/05-architecture/i18n-rules.md` §9). Use Next.js built-in `i18n` routing with the locale as the first URL segment. Query-param locale routing is rejected.

```
app/
  [locale]/
    page.tsx                   ← Marketing homepage (localized)
    layout.tsx                 ← Locale layout (sets i18n context)
    how-it-works/
      page.tsx
    pricing/
      page.tsx
    use-cases/
      [slug]/
        page.tsx               ← Use-case landing pages
  (app)/
    draft/
      new/
        page.tsx               ← Create new session and draft
      [draftId]/
        page.tsx               ← Draft workspace (conversation + preview)
        review/
          page.tsx             ← Review before checkout
        checkout/
          page.tsx             ← Payment
        confirmation/
          page.tsx             ← Post-dispatch confirmation
    resume/
      [token]/
        page.tsx               ← Resume a session via token
  layout.tsx                   ← Root layout
```

**Rules:**
- App Router only — no Pages Router
- Marketing pages under `[locale]/` for SEO (SSG/SSR, indexable)
- App pages under `(app)/` route group — `noindex`, not locale-prefixed in URL (locale from session)
- Route groups used to share layouts without affecting URL structure
- No client-side routing to provider URLs
- Redirect after payment is handled server-side (Stripe webhook → backend state → frontend polls React Query)

---

## 5. Editing Rules

- Do not adopt a rich-text editor framework (Quill, TipTap, ProseMirror) by default
- MVP editing is simple text input and textarea fields mapping to canonical template schema fields
- If richer editing becomes necessary post-MVP, it must still map back to the same canonical schema — no freeform HTML blobs stored in the draft

---

## 6. I18n Rules

All user-facing strings go through the i18n message layer. No hardcoded copy in components.

Supported locales: `de-CH`, `fr-CH`, `it-CH`, `en-CH`.

See `docs/05-architecture/i18n-rules.md` for full rules.

---

## 7. Mobile-First Rules

- All product flows (drafting, checkout, confirmation) are mobile-first
- No desktop-only affordances in payment or confirmation screens
- Preview and conversation panel adapt gracefully to small viewports — not hidden on mobile
- Touch targets ≥ 44px

---

## 8. Provider Isolation

- Frontend never calls postal providers, payment providers, or any external API directly
- Frontend talks only to the backend (`/api/...` routes)
- No raw provider payloads (Stripe, postal) in frontend component props or state
- Provider references visible to the user (tracking codes, payment references) are passed through backend responses already normalized to app types

---

## Cross-References

| Document | Relationship |
|---|---|
| `docs/05-architecture/stack-decisions.md` | Full technology rationale |
| `docs/05-architecture/system-contracts.md` | Canonical types used in API client and React Query |
| `docs/05-architecture/i18n-rules.md` | String externalization rules |
| `docs/05-architecture/error-taxonomy.md` | Error families frontend components must handle |
| `shared/` | Zod schemas, API client, query keys, enums |
