# Swiss Mail — Database Schema

**Status:** Authoritative reference  
**Resolves:** GAP-5 (full column-level schema), INCON-3 (SignatureAsset unification), INCON-4 (DraftSnapshot definition), INCON-5 (PaymentState completeness), IMPROV-5 (ORM decision), IMPROV-10 (complete DraftLetter contract)  
**Stack:** Node.js + TypeScript · PostgreSQL · Drizzle ORM

---

## 1. ORM / Query Builder Decision

### Option A — Drizzle ORM ✅ RECOMMENDED

| Dimension | Assessment |
|---|---|
| Type safety | TypeScript-native; schema definitions are TS, not a separate DSL |
| SQL fidelity | SQL-like query builder; devs know what queries execute |
| Migration tooling | `drizzle-kit` generates and applies migrations |
| Zod compatibility | First-class `drizzle-zod` integration for shared schemas |
| Runtime weight | Lightweight; no separate query engine binary |
| Ecosystem maturity | Younger but rapidly growing; adequate for this stack |

### Option B — Prisma

| Dimension | Assessment |
|---|---|
| Type safety | Excellent; auto-generated types |
| Schema language | Own `.prisma` DSL, not TypeScript — conflicts with TypeScript-first principle |
| Runtime weight | Separate Rust query engine; adds latency and complexity |
| Complex queries | Painful; raw SQL escapes required frequently |
| State machine fit | Abstraction level fights explicit transition logging |

### Option C — Knex + manual types

| Dimension | Assessment |
|---|---|
| SQL control | Full, mature |
| Type safety | None generated; all types maintained by hand |
| Maintenance burden | High; drift between runtime and types is guaranteed |

**Decision: Option A — Drizzle ORM.**  
Aligns with TypeScript-first and schema-first philosophy. `drizzle-zod` bridges database schema and shared Zod contracts without duplication. Migrations via `drizzle-kit`, stored in `backend/drizzle/`.

---

## 2. Schema Conventions

| Convention | Rule |
|---|---|
| Table names | `snake_case`, plural (e.g. `draft_letters`) |
| Column names | `snake_case` |
| Primary keys | UUID v7 (time-sortable) as `id uuid` |
| Timestamps | `created_at timestamptz` and `updated_at timestamptz` on every mutable table |
| Enums | PostgreSQL native enums; names mirror TypeScript enum names from `shared/` |
| Money | Integer cents only — `250` = CHF 2.50 |
| Currency | CHF only |
| Soft delete | **Not used.** Hard delete with audit trail via append-only event tables |
| Nullable philosophy | Columns nullable only when the value is genuinely optional at the time of row creation |

---

## 3. PostgreSQL Enums

All enums must be created before tables that reference them. TypeScript counterparts live in `shared/enums.ts`.

```sql
CREATE TYPE session_type     AS ENUM ('guest');
CREATE TYPE locale_enum      AS ENUM ('de-CH', 'fr-CH', 'it-CH', 'en-CH');
CREATE TYPE draft_status     AS ENUM (
  'collecting', 'fields_complete', 'reviewed',
  'rendering', 'ready', 'submitted', 'dispatched', 'closed'
);
CREATE TYPE delivery_type    AS ENUM ('standard', 'registered');
CREATE TYPE file_asset_kind  AS ENUM ('attachment', 'signature', 'rendered_pdf');
CREATE TYPE file_status      AS ENUM ('active', 'pending_deletion', 'deleted');
CREATE TYPE message_role     AS ENUM ('user', 'assistant', 'system');
CREATE TYPE payment_state    AS ENUM (
  'pending', 'authorized', 'captured',
  'failed', 'cancelled',
  'refund_pending', 'refunded', 'partially_refunded'
);
-- Note: 'cancelled' and 'partially_refunded' added here — they were missing from
-- the earlier system-contracts draft (resolves INCON-5).
CREATE TYPE dispatch_state   AS ENUM (
  'queued', 'submitted', 'accepted',
  'rejected', 'unknown', 'reconciled'
);
-- Note: 'draft' removed from dispatch_state; dispatch rows are only created
-- when a draft is ready to send. The draft_status enum carries pre-dispatch state.
```

---

## 4. Full Table Definitions

### 4.1 `sessions`

The root entity. Every interaction starts here.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `type` | `session_type` | NO | `'guest'` | |
| `email` | `text` | YES | — | Collected at checkout, not at session creation |
| `resume_token_hash` | `text` | NO | — | SHA-256 or equivalent hash of the opaque guest-resume token; unique |
| `resume_token_expires_at` | `timestamptz` | NO | — | |
| `locale` | `locale_enum` | NO | `'de-CH'` | |
| `ip_address` | `inet` | YES | — | Rate-limiting only; not retained long-term |
| `expires_at` | `timestamptz` | NO | — | Config-driven session expiry; recommended default 72h (see open-decisions.md §4) |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | |

**Constraints:** `UNIQUE (resume_token_hash)`  
**Indexes:** `resume_token_hash` (unique lookup), `expires_at` (retention cleanup)

---

### 4.2 `draft_letters`

Core draft entity. Mutable until `reviewed`; status then advances via explicit transitions.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `session_id` | `uuid` | NO | — | FK → `sessions(id)` |
| `status` | `draft_status` | NO | `'collecting'` | See state machine §5 |
| `locale` | `locale_enum` | NO | — | Copied from session at creation |
| `delivery_type` | `delivery_type` | NO | `'standard'` | |
| `subject` | `text` | YES | — | CHECK `length(subject) <= 200` |
| `body` | `text` | YES | — | HTML content for letter body; rendered by Puppeteer. CHECK `length(body) <= 10000`. API field name is also `body`. |
| `tone` | `text` | YES | — | e.g. `'formal'`, `'neutral'`, `'firm'` |
| `intent` | `text` | YES | — | AI-classified intent label |
| `enclosure_note` | `text` | YES | — | e.g. "Beilage: Kopie Mietvertrag" |
| `signature_mode` | `text` | YES | — | `'typed'` or `'image'`; `NULL` until the user completes signature choice |
| `schema_version` | `int` | NO | `1` | For future migration of snapshot_data |
| `sender_profile_id` | `uuid` | YES | — | FK → `sender_profiles(id)` |
| `recipient_profile_id` | `uuid` | YES | — | FK → `recipient_profiles(id)` |
| `signature_asset_id` | `uuid` | YES | — | FK → `file_assets(id)` where `kind = 'signature'` |
| `estimated_pages` | `int` | YES | — | Set during rendering |
| `reviewed_at` | `timestamptz` | YES | — | Set when user confirms review; triggers snapshot |
| `metadata` | `jsonb` | YES | — | Reference numbers, dates, flexible fields |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | |

**Indexes:** `session_id`, `status`, `created_at` (retention cleanup)

**Draft contract fields** (resolves IMPROV-10):  
`sender_profile_id`, `recipient_profile_id`, `delivery_type`, `subject`, `body`, `enclosure_note`, `signature_mode`, `signature_asset_id`, attachment refs (via `file_assets`), `reviewed_at`, `schema_version`, `locale`, `tone`, `intent`, `metadata`.

---

### 4.3 `draft_snapshots`

**Immutable** snapshot created at review time. This is the version used for rendering and dispatch. Once a row is inserted it must never be updated. Ensures the PDF and dispatched letter match exactly what the user reviewed. Resolves **INCON-4**.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `draft_id` | `uuid` | NO | — | FK → `draft_letters(id)` |
| `version` | `int` | NO | `1` | Increments if a re-review produces a new snapshot |
| `snapshot_data` | `jsonb` | NO | — | Complete letter content at review time (see below) |
| `rendered_pdf_asset_id` | `uuid` | YES | — | FK → `file_assets(id)` where `kind = 'rendered_pdf'`; set after rendering |
| `created_at` | `timestamptz` | NO | `now()` | No `updated_at` — row is immutable |

**Constraints:** `UNIQUE (draft_id, version)`  
**Indexes:** `draft_id`, `(draft_id, version)` unique

**`snapshot_data` shape:**
```jsonc
{
  "schemaVersion": 1,
  "locale": "de-CH",
  "deliveryType": "standard",
  "subject": "...",
  "body": "...",
  "enclosureNote": "...",
  "signatureMode": "image",
  "tone": "formal",
  "intent": "...",
  "sender": { "firstName": "...", "lastName": "...", "company": null, "addressLine1": "...", "addressLine2": null, "postalCode": "1234", "city": "...", "country": "CH" },
  "recipient": { "firstName": "...", "lastName": "...", "company": null, "department": null, "addressLine1": "...", "addressLine2": null, "postalCode": "1234", "city": "...", "country": "CH" },
  "attachmentAssetIds": ["uuid", "..."],
  "signatureAssetId": "uuid | null",
  "metadata": {}
}
```

---

### 4.4 `sender_profiles`

Column names must match the entity contracts in `system-contracts.md` § 4.3 and the API schemas in
`api-contracts.md` § 3.4. `first_name`/`last_name` split is required for formal letter salutations.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `session_id` | `uuid` | NO | — | FK → `sessions(id)` |
| `first_name` | `text` | NO | — | |
| `last_name` | `text` | NO | — | |
| `company` | `text` | YES | — | |
| `address_line_1` | `text` | NO | — | |
| `address_line_2` | `text` | YES | — | |
| `postal_code` | `text` | NO | — | CHECK `postal_code ~ '^[0-9]{4}$'` |
| `city` | `text` | NO | — | |
| `country` | `text` | NO | `'CH'` | ISO 3166-1 alpha-2 |
| `phone` | `text` | YES | — | |
| `email` | `text` | YES | — | |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | |

**Indexes:** `session_id`

---

### 4.5 `recipient_profiles`

Column names must match the entity contracts in `system-contracts.md` § 4.4 and the API schemas in
`api-contracts.md` § 3.4.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `session_id` | `uuid` | NO | — | FK → `sessions(id)` |
| `first_name` | `text` | YES | — | At least one of first_name, last_name, company required |
| `last_name` | `text` | YES | — | |
| `company` | `text` | YES | — | |
| `department` | `text` | YES | — | |
| `address_line_1` | `text` | NO | — | |
| `address_line_2` | `text` | YES | — | |
| `postal_code` | `text` | NO | — | CHECK `postal_code ~ '^[0-9]{4}$'` |
| `city` | `text` | NO | — | |
| `country` | `text` | NO | `'CH'` | |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | |

**Indexes:** `session_id`

---

### 4.6 `file_assets`

Unified table for all file types: attachments, signature images, rendered PDFs.  
**SignatureAsset is NOT a separate table** — it is a `file_assets` row with `kind = 'signature'`. Resolves **INCON-3**.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `session_id` | `uuid` | NO | — | FK → `sessions(id)` |
| `draft_id` | `uuid` | YES | — | FK → `draft_letters(id)`; null for pre-association uploads |
| `kind` | `file_asset_kind` | NO | — | `attachment`, `signature`, `rendered_pdf` |
| `storage_key` | `text` | NO | — | UNIQUE; namespaced per §Storage Keys |
| `original_filename` | `text` | YES | — | User-supplied filename; sanitised before storage |
| `mime_type` | `text` | NO | — | |
| `size_bytes` | `int` | NO | — | |
| `sort_order` | `int` | YES | — | Attachment ordering within a draft |
| `status` | `file_status` | NO | `'active'` | |
| `deleted_at` | `timestamptz` | YES | — | Set when status transitions to `deleted` |
| `created_at` | `timestamptz` | NO | `now()` | No `updated_at`; status transitions are the mutation |

**Constraints:** `UNIQUE (storage_key)`  
**Indexes:** `session_id`, `draft_id`, `kind`, `storage_key` (unique), `status` (retention cleanup)

**Storage key patterns:**
- `attachments/{sessionId}/{fileId}`
- `signatures/{sessionId}/{fileId}`
- `renders/{draftId}/{renderVersion}.pdf`

---

### 4.7 `conversation_messages`

AI conversation history for the drafting session.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `draft_id` | `uuid` | NO | — | FK → `draft_letters(id)` |
| `role` | `message_role` | NO | — | `user`, `assistant`, `system` |
| `content` | `text` | NO | — | |
| `tool_calls` | `jsonb` | YES | — | Structured AI tool output |
| `created_at` | `timestamptz` | NO | `now()` | Append-only; no `updated_at` |

**Indexes:** `(draft_id, created_at)` — ordered conversation retrieval

---

### 4.8 `payment_attempts`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `draft_id` | `uuid` | NO | — | FK → `draft_letters(id)` |
| `session_id` | `uuid` | NO | — | FK → `sessions(id)` |
| `state` | `payment_state` | NO | `'pending'` | See state machine §5 |
| `stripe_payment_intent_id` | `text` | YES | — | UNIQUE when set |
| `stripe_charge_id` | `text` | YES | — | Set after authorization; used for capture and refund lookups |
| `amount_cents` | `int` | NO | — | Total in CHF cents |
| `currency` | `text` | NO | `'CHF'` | Always CHF |
| `breakdown` | `jsonb` | NO | — | `{ base, pages, delivery, attachments }` all in cents |
| `failure_reason` | `text` | YES | — | Canonical error family, not raw Stripe message |
| `refund_reason` | `text` | YES | — | Admin-supplied reason |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | |

**Constraints:** `UNIQUE (stripe_payment_intent_id)` where not null  
**Indexes:** `draft_id`, `session_id`, `stripe_payment_intent_id`, `state`

---

### 4.9 `dispatch_attempts`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `draft_id` | `uuid` | NO | — | FK → `draft_letters(id)` |
| `snapshot_id` | `uuid` | NO | — | FK → `draft_snapshots(id)` — dispatch always against a snapshot |
| `state` | `dispatch_state` | NO | `'queued'` | See state machine §5 |
| `provider_name` | `text` | NO | — | Adapter identifier (e.g. `'epost-smartsend'`) |
| `provider_reference` | `text` | YES | — | External reference/tracking ID from provider |
| `provider_payload` | `jsonb` | YES | — | Raw provider response; for debugging only, never surfaced to users |
| `submitted_at` | `timestamptz` | YES | — | |
| `last_checked_at` | `timestamptz` | YES | — | Last reconciliation poll |
| `failure_reason` | `text` | YES | — | Canonical error family |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | |

**Indexes:** `draft_id`, `snapshot_id`, `provider_reference`, `state`

---

### 4.10 `dispatch_status_events`

Append-only log of every dispatch state transition. Used for audit, support, and reconciliation.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `dispatch_attempt_id` | `uuid` | NO | — | FK → `dispatch_attempts(id)` |
| `previous_state` | `dispatch_state` | YES | — | Null on first transition from initial state |
| `new_state` | `dispatch_state` | NO | — | |
| `source` | `text` | NO | — | `'webhook'`, `'polling'`, `'manual'`, `'system'` |
| `provider_event_data` | `jsonb` | YES | — | Raw provider event if applicable |
| `created_at` | `timestamptz` | NO | `now()` | Append-only; no `updated_at` |

**Indexes:** `(dispatch_attempt_id, created_at)` — ordered event log

---

### 4.11 `support_events`

Admin/support audit trail. Append-only.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v7()` | PK |
| `session_id` | `uuid` | YES | — | FK → `sessions(id)` |
| `draft_id` | `uuid` | YES | — | FK → `draft_letters(id)` |
| `event_type` | `text` | NO | — | e.g. `'refund_initiated'`, `'retry_dispatch'`, `'escalation'` |
| `actor` | `text` | NO | — | Admin user identifier |
| `details` | `jsonb` | YES | — | |
| `created_at` | `timestamptz` | NO | `now()` | Append-only; no `updated_at` |

**Indexes:** `session_id`, `draft_id`, `event_type`, `created_at`

---

## 5. State Machines

### Draft status

```
collecting
  → fields_complete

fields_complete
  → collecting
  → reviewed

reviewed
  → rendering

rendering
  → ready
  → collecting

ready
  → submitted          (payment authorized; dispatch queued or submitted)
  → collecting

submitted
  → dispatched         (provider accepted and payment capture confirmed)
  → closed             (dispatch failed, authorization cancelled, refund completed, or escalation recorded)

dispatched
  → closed
```

### Payment state

```
pending
  → authorized         (Stripe auth hold)
  → failed             (terminal)
  → cancelled          (user cancelled or timed out)

authorized
  → captured           (capture confirmed after dispatch acceptance)
  → cancelled
  → failed

captured
  → refund_pending
  → refunded           (terminal)
  → partially_refunded (terminal)
```

### Dispatch state

```
queued
  → submitted          (sent to provider)

submitted
  → accepted           (provider confirmed physical dispatch)
  → rejected           (terminal: provider refused)
  → unknown            (ambiguous response; awaiting reconciliation)

unknown
  → reconciled         (resolved via polling or manual intervention)
  → accepted
  → rejected
```

All transitions must produce a `dispatch_status_events` row. No silent transitions.

---

## 6. Entity Relationship Diagram

```
sessions ─────────────────────────────────────────────────────────────┐
  id                                                                   │
  │                                                                    │
  ├─── draft_letters ────────────────────────────────────────────────┐ │
  │      id                                                          │ │
  │      session_id ──────────────────────────────────────────────── │─┘
  │      sender_profile_id ──→ sender_profiles.id                    │
  │      recipient_profile_id ─→ recipient_profiles.id               │
  │      signature_asset_id ──→ file_assets.id (kind=signature)      │
  │      │                                                            │
  │      ├─── draft_snapshots                                         │
  │      │      draft_id ──→ draft_letters.id                         │
  │      │      rendered_pdf_asset_id ──→ file_assets.id              │
  │      │                                                            │
  │      ├─── conversation_messages                                   │
  │      │      draft_id ──→ draft_letters.id                         │
  │      │                                                            │
  │      ├─── payment_attempts                                         │
  │      │      draft_id ──→ draft_letters.id                         │
  │      │      session_id ──────────────────────────────────────────┘
  │      │                                                            
  │      ├─── dispatch_attempts                                        
  │      │      draft_id ──→ draft_letters.id                         
  │      │      snapshot_id ──→ draft_snapshots.id                    
  │      │      │                                                      
  │      │      └─── dispatch_status_events                            
  │      │             dispatch_attempt_id ──→ dispatch_attempts.id    
  │      │                                                              
  │      └─── support_events                                           
  │             draft_id ──→ draft_letters.id                         
  │                                                                    
  ├─── sender_profiles                                                 
  │      session_id ──→ sessions.id                                    
  │                                                                    
  ├─── recipient_profiles                                              
  │      session_id ──→ sessions.id                                    
  │                                                                    
  ├─── file_assets                                                     
  │      session_id ──→ sessions.id                                    
  │      draft_id ──→ draft_letters.id (nullable)                      
  │      kind: attachment | signature | rendered_pdf                  
  │                                                                    
  └─── support_events                                                  
         session_id ──→ sessions.id                                   
```

---

## 7. Migration Strategy

- **Tooling:** `drizzle-kit` (bundled with Drizzle ORM)
- **Location:** `backend/drizzle/migrations/`
- **Naming:** timestamp-prefixed sequential — `0001_create_enums.sql`, `0002_create_sessions.sql`, etc.
- **Reversibility:** every migration must include a `down` migration
- **Ordering:** enums first, then tables with no foreign keys, then tables with foreign keys
- **Seed data:** none in production; test fixtures via a separate `backend/drizzle/seeds/test/` directory
- **CI:** migrations run automatically in CI against a fresh database; rollback is verified

**Suggested migration sequence:**
```
0001_create_enums.sql
0002_create_sessions.sql
0003_create_sender_profiles.sql
0004_create_recipient_profiles.sql
0005_create_draft_letters.sql
0006_create_draft_snapshots.sql
0007_create_file_assets.sql
0008_create_conversation_messages.sql
0009_create_payment_attempts.sql
0010_create_dispatch_attempts.sql
0011_create_dispatch_status_events.sql
0012_create_support_events.sql
```

---

## 8. Indexing Strategy

| Table | Index | Columns | Purpose |
|---|---|---|---|
| `sessions` | unique | `resume_token_hash` | Guest resume lookup |
| `sessions` | btree | `expires_at` | Retention cleanup job |
| `draft_letters` | btree | `session_id` | Draft list for session |
| `draft_letters` | btree | `status` | Queue filtering by status |
| `draft_letters` | btree | `created_at` | Retention cleanup |
| `draft_snapshots` | unique | `(draft_id, version)` | Version uniqueness |
| `draft_snapshots` | btree | `draft_id` | Snapshot lookup for draft |
| `sender_profiles` | btree | `session_id` | Profile lookup for session |
| `recipient_profiles` | btree | `session_id` | Profile lookup for session |
| `file_assets` | unique | `storage_key` | Dedup / lookup by key |
| `file_assets` | btree | `session_id` | Asset list for session |
| `file_assets` | btree | `draft_id` | Asset list for draft |
| `file_assets` | btree | `(kind, status)` | Retention cleanup by type |
| `conversation_messages` | btree | `(draft_id, created_at)` | Ordered conversation fetch |
| `payment_attempts` | unique | `stripe_payment_intent_id` | Webhook dedup |
| `payment_attempts` | btree | `draft_id` | Payment history for draft |
| `payment_attempts` | btree | `session_id` | Payment history for session |
| `payment_attempts` | btree | `state` | Admin queue views |
| `dispatch_attempts` | btree | `draft_id` | Dispatch history for draft |
| `dispatch_attempts` | btree | `snapshot_id` | Dispatch for snapshot |
| `dispatch_attempts` | btree | `provider_reference` | Webhook / polling lookup |
| `dispatch_attempts` | btree | `state` | Reconciliation queue |
| `dispatch_status_events` | btree | `(dispatch_attempt_id, created_at)` | Ordered event log |
| `support_events` | btree | `session_id` | Admin session view |
| `support_events` | btree | `draft_id` | Admin draft view |
| `support_events` | btree | `(event_type, created_at)` | Audit filtering |

---

## 9. Provisional Limits

These are configurable defaults enforced at the application layer. File and content limits below are currently locked as provisional defaults. Retention durations remain open and must not be treated as launch-approved truth.

| Limit | Provisional value | Config key |
|---|---|---|
| Session resume window | Configured at deploy time | `SESSION_RESUME_TTL_HOURS` |
| Draft/content expiry | Configured at deploy time | `DRAFT_EXPIRY_DAYS` |
| File retention | Configured at deploy time | `FILE_RETENTION_DAYS` |
| Metadata retention | Configured at deploy time | `METADATA_RETENTION_DAYS` |
| Max file size per upload | 5 MB | `MAX_FILE_SIZE_BYTES` |
| Max attachments per draft | 5 | `MAX_ATTACHMENTS_PER_DRAFT` |
| Max total upload size per draft | 20 MB | `MAX_DRAFT_UPLOAD_TOTAL_BYTES` |
| Max body length | 10,000 characters | `MAX_BODY_LENGTH_CHARS` |
| Max subject length | 200 characters | `MAX_SUBJECT_LENGTH_CHARS` |

---

## 10. Open Questions

The following items are not yet resolved and must not be papered over with defaults in code:

| ID | Item | Blocking |
|---|---|---|
| GAP-1 | Dispatch provider sandbox credentials not yet obtained | Yes — adapter direction is locked (Swiss Post Digital Commerce API) but sandbox access is needed |
| GAP-2 | Exact Stripe webhook/capture mechanics for the locked authorize-then-capture flow | Yes |
| GAP-3 | Retention duration legal sign-off | No — recommended defaults are locked; final approval is operational |
| GAP-4 | ~~Hosted topology approval~~ | Resolved — Infomaniak-centered topology is locked |
| OPEN-1 | ~~Exact transactional email vendor~~ | Resolved — Resend is locked |

---

## 11. Relationship to Other Documents

| Document | Relationship |
|---|---|
| `docs/05-architecture/system-contracts.md` | This file is the column-level expansion of that entity list. If those entities change, update this file first. |
| `docs/06-build-packs/backend-build-pack.md` | Table names here must stay consistent with the backend implementation blueprint. |
| `docs/05-architecture/stack-decisions.md` | ORM decision (§1) supplements the stack decisions table. |
| `shared/enums.ts` | PostgreSQL enums in §3 must stay in sync with TypeScript counterparts. `drizzle-zod` is the bridge. |
| `backend/drizzle/` | Migrations implementing this schema live there. |
