# Data retention: uploaded documents

Audit date: 2026-07-28. Covers what episto stores when a user attaches a
document, how long it lives, and what was wrong when this was first written.

## User story

> As someone uploading my mobile contract so the assistant can write my
> cancellation letter, I want that document used for the draft and then gone.
> I did not sign up to have my contract sitting on a server.

That is the standard the rest of this document is measured against.

## What a document turns into

One upload produces four separate artefacts, and each needs its own answer.

| Artefact                        | Where                                     | Needed until                                        |
| ------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| The file itself                 | MinIO, `attachments/{sessionId}/{fileId}` | dispatch — attachments are enclosed with the letter |
| `file_assets.extracted_text`    | Postgres, up to 12,000 chars              | the letter body is finished                         |
| The prompt containing that text | sent to Azure Foundry                     | the API call                                        |
| `conversation_messages.content` | Postgres                                  | — (never receives the document text)                |

The last row is the good news, and it is deliberate: `ai.handler.ts` persists
the user's raw `userContent`, never `augmentedContent`. The attachment block is
rebuilt from the database on every turn and never written back. Verified in
production: zero conversation rows contain the block.

The prompt does reach Azure. There is no zero-retention agreement in the code
or in configuration. If we want to promise "your document is never retained by
a third party", that promise has to be bought from Azure, not written here.

## Findings (2026-07-28)

### F1 — extracted text survived deletion, forever

`deleteFileAsset` (`file.service.ts:255`) and the cleanup worker
(`cleanup-assets.worker.ts:57-63`) both set `status='deleted'` and leave
`extracted_text` populated. Deleting a file removed the file and kept its
contents. Nothing anywhere ever set that column back to NULL.

### F2 — orphaned objects could never be cleaned

Uploads write to object storage first and insert the `file_assets` row second
(`render-snapshot-pipeline.ts:78` then `:90`; `file.routes.ts:211` then `:219`).
If anything in between fails, the object exists with no row pointing at it. The
retention worker iterates rows, so an orphan is invisible to it and is retained
permanently.

Production had 13 objects against 5 rows: 4 rendered letters and 4 handwritten
signature images with no database row at all.

### F3 — expired-session cleanup did nothing

Step 1 of the cleanup worker selected expired sessions, assigned the count to a
variable, and moved on. The log line then reported `expiredSessions: n`, which
reads like work was done. Sessions expire after 72h; their files were only ever
reached by the 15-day content sweep.

### F4 — retention was measured from the wrong event

Attachments were swept `CONTENT_RETENTION_DAYS` (15) after _creation_. The
letter is usually dispatched within minutes. So a document sat around for two
weeks after the only thing that needed it had happened.

### F5 — no stated retention period

The privacy page says we keep data "only for as long as needed"
(`privacy.retentionBody`). That is not a period, and it is not checkable.

## What we now do

- **Extracted text is cleared the moment it is no longer needed**: on dispatch,
  on any deletion, and on the retention sweep. It is never left behind.
- **Retention runs from dispatch, not from upload.** Once the letter is on its
  way, the attachment has no remaining purpose.
- **Abandoned drafts** still fall back to a time-from-creation sweep, because
  nothing else will ever collect them.
- **Orphans are reconciled**, so a failed upload cannot silently become
  permanent storage.
- **The receipt is the deliberate exception.** VAT receipts are accounting
  records and are retained per Swiss bookkeeping duty, not per this policy.

### Hardening added after review

A second review pass (codex, 2026-07-28) found the first implementation could
lose data it should keep and keep data it should lose. What changed:

- **The orphan sweep will not delete what it cannot prove is an orphan.** An
  object with no readable timestamp is skipped, and ownership is re-checked
  immediately before the delete — render keys are deterministic, so a re-render
  can claim a key between the batch lookup and the delete.
- **Candidate lookups are batched** (200 keys), so a large bucket cannot take
  the whole sweep down with one oversized query.
- **Registration is atomic.** The rendered PDF's row and its snapshot link are
  written in one transaction, so the compensating delete can never remove an
  object a surviving row still points at. The upload itself is inside the
  compensating scope too — an upload that writes the object and _then_ reports
  failure used to leak it. (Receipts are wrapped the same way, but the later
  hardening below stops the delete from firing on them: a leaked receipt object
  is the outcome we accept there.)
- **Deletion is retried rather than assumed.** A user-deleted file goes to
  `pending_deletion` (invisible to the user either way) and only becomes
  `deleted` once the object is physically gone. A failure records
  `deletion_failed_at`, so one broken object rotates to the back of the queue
  instead of sitting at the head of every run and starving everything behind it
  (migration `0023_file_asset_deletion_retry`).
- **Dispatch retention asks the right question.** A draft can have several
  dispatch attempts; joining on `draft_id` let an old submitted attempt retire
  the enclosures a newer, still-queued attempt needs. The steps now require a
  submitted attempt _and_ no attempt still waiting to go out.
- **Extraction cannot resurrect deleted content.** Ingestion writes are guarded
  on the row still being `active`, so an OCR job finishing after a deletion
  cannot write the document's text back into a purged row.
- **Erasure erases now, not eventually.** Admin session erasure clears
  `extracted_text` in the same transaction and deletes the draft's
  `conversation_messages` — the user's own account of their situation, as
  sensitive as the letter body.
- **Rows already marked `deleted` are swept for leftover text**, because the
  pre-fix code left it there and those rows still exist.

### Hardening added after the second review

A third pass (codex, 2026-07-28) found that the compensating delete introduced
above could itself destroy live data. What changed:

- **A compensating delete now asks who owns the key.** `renders/{draftId}/
{version}.pdf` and `receipts/{paymentAttemptId}.pdf` are deterministic, and
  `storage_key` is unique — so a re-render or a receipt retry overwrites an
  object that a previous, _successful_ registration owns, and then fails to
  insert its own row. The old code deleted on that failure, taking out a live
  letter or a VAT receipt we are legally required to keep. `isStorageKeyOwned`
  is now the single definition of "orphan", checked by the compensating delete
  and by the sweep, and it consults `receipts` as well as `file_assets`.
- **Every prefix the app writes is reconciled.** `signed-documents/` had a key
  builder but appeared in no sweep, so an orphaned signed PDF survived
  indefinitely. `STORAGE_PREFIXES` now lists all five in one place and
  `SWEPT_PREFIXES` derives from it, so adding a prefix without deciding its
  retention is no longer silent. `receipts/` remains the deliberate exclusion.
- **A delete of an unowned object is conditional on that object.** Asking who
  owns the key is a check, and the delete that follows it is a separate
  operation: a re-render that has uploaded but not yet inserted its row looks
  exactly like an orphan in between. Both callers now go through
  `deleteUnownedObject`, which re-dates the object (the sweep's listing can be
  minutes old) and then deletes it _with an `If-Match` on the ETag it just
  read_, so a write that lands after the check makes the delete fail
  harmlessly.

  This narrows the window; it does not close it. A rewrite with byte-identical
  content keeps the same ETag, and our PDFs are deterministic. Closing it
  properly needs immutable storage keys or bucket versioning — worth doing, not
  worth pretending. So the objects we genuinely cannot lose are protected by
  policy instead: `deleteUnownedObject` refuses any key outside
  `SWEPT_PREFIXES`, which means **a receipt is never deleted speculatively at
  all**, not by the sweep and not by a compensating delete. An orphaned receipt
  object costs a few kilobytes; a deleted one costs a record Swiss bookkeeping
  duty requires us to produce.

- **The text purge carries the same retry guard as the object steps.** It asked
  only whether _some_ dispatch attempt had been submitted, so an old submitted
  attempt erased the attachment text a newer, still-queued retry needs.
- **Known and accepted:** two worker processes can pick up the same
  `pending_deletion` row, because that batch is selected without a claim. Both
  delete the same key and both write the same `deleted` status, so the cost is
  duplicate work, not a wrong outcome — a `file_assets` row's `storage_key` is
  unique and stays that row's forever, so nothing else can come to own the key
  it deletes. Worth a claim if we ever run more than one cleanup worker.
- **Letter parameters are treated as data.** `subject`, `intent`, `tone`,
  `enclosureNote` and the party names are interpolated into the _drafting
  system prompt_, and the intake model fills them in from the conversation and
  from attached document text — so a PDF a stranger emails the user could
  propose their values. Only `subject` had a length cap. `promptParameter` now
  collapses each to a single capped line with the delimiters defanged, so an
  injected value cannot open a new line and read as an instruction.

## The conversation itself

> As someone who told the assistant that my landlord kept my deposit and that
> I have been off work since March, I want that account of my life gone on the
> same schedule as the letter it produced.

The document artefacts above all had a schedule. `conversation_messages` — the
user's own words, often more revealing than the letter — had none: admin
erasure was the only path, so an abandoned draft kept its conversation
indefinitely. Step 9 of the cleanup worker now collects it
(`conversation-retention.service.ts`), on its own dial
(`CONVERSATION_RETENTION_DAYS`, default 15) because it is a distinct data class
from the documents.

What the predicate has to get right, and what each rule protects:

- **A draft is collected whole.** The batch limit counts drafts, not rows;
  half a conversation reads as complete but is not.
- **A queued attempt blocks collection.** The conversation is the context a
  redraft works from. Only `state='queued'` counts as waiting — a `rejected`
  attempt also has a null `submitted_at`, and reading that as "still pending"
  would retain the conversation forever. The same correction was applied to the
  three pre-existing object/text steps, which had the identical bug.
- **Retention runs from the _latest_ submission.** With several attempts, an
  old one must not retire the conversation behind a letter posted yesterday.
- **Abandoned drafts fall back to age or session expiry**, since nothing else
  will ever collect them.

Each of those is a test in `backend/tests/conversation-retention.integration.test.ts`,
run against a real Postgres — the predicates are too subtle to assert as query
strings.

## Erasure

> As someone who asked support to delete my data, I want it gone — not gone
> until the drafting job that was already running finishes and writes it back.

Admin erasure (`POST /admin/sessions/:id/erase`,
`modules/admin/admin-erasure.service.ts`) had three holes, all found by review
(codex, 2026-07-28) and all closed by migration
`0024_draft_erasure_tombstone`:

- **`draft_letters.metadata` was a second copy of the letter.** It is named
  like bookkeeping, but the drafting model persists the structured document —
  body included — into it, and it is client-writable. Erasure now clears it.
- **`draft_snapshots.snapshot_data` was a third copy**, and nothing in the
  codebase had ever cleared it. It holds the frozen letter plus both addresses.
  Erasure now overwrites it with `{}`. That value is deliberately _not_ a valid
  snapshot: erased data must never look like a letter something downstream can
  render or dispatch. Readers tell "erased" from "corrupt" via
  `parseStoredSnapshotData`, so a stale link gives a 410, not a 500.
- **Nothing recorded that a draft had been erased.** An Azure drafting call
  runs for tens of seconds; one that loaded the draft before erasure could
  write the body, the metadata or a new message back afterwards.

### Why the guard is a trigger and not a service check

`erasure_requested_at` is enforced by database triggers, not by a helper called
from each of the ~15 write paths. Two reasons, and the second is the one that
matters:

1. A helper can be forgotten by the next writer. A trigger cannot.
2. A service-side check is a check-then-write and loses the very race it exists
   to win: read "not erased", erasure commits, stale write lands. The triggers
   take `FOR SHARE` on the draft row, and erasure holds it `FOR UPDATE` — so a
   racing writer _blocks_ until erasure commits and then sees the tombstone.
   `erasure.integration.test.ts` proves this with two real connections.

The rule the triggers encode: **once a draft is erased, the only write it
accepts is another write that removes data.** That keeps erasure re-runnable
without opening a hole. Violations raise SQLSTATE `ZE001`, translated once in
`app.ts` to a 410 `DRAFT_ERASED` — one translation point, which is the payoff
of enforcing it in the database.

Idempotency is now the tombstone. It used to be "subject, body and tone are all
null", which is also true of every draft abandoned while still collecting — so
erasure skipped exactly those drafts' profiles, metadata, files and
conversation. Shared profiles are also respected: a profile a retained paid
order still points at is not redacted.

### Erasure beyond the draft

The first version of erasure stopped at the letter. Everything a support agent
would actually use to find the person again sat one table over, so a request to
be forgotten left the identity fully intact. `session-erasure.ts` now scrubs, in
the same transaction:

| Where                                | What goes                                                | What stays, and why                                                             |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `sessions`                           | `email`, `phone_e164`, `ip_address`, `phone_verified_at` | nothing                                                                         |
| `sessions.resume_token_hash`         | rotated to a hash nobody holds                           | the column is `NOT NULL`; rotating is what actually kills the magic-resume link |
| `phone_verifications`                | number, code hash, provider message id, IP, user agent   | row shape, so the rate limiter still counts                                     |
| `payment_attempts`                   | `verified_phone_e164`, order-access token + expiry       | amount, VAT, capture time, Stripe ids — the accounting record                   |
| `payment_attempts` (retained orders) | `failure_reason`, `refund_reason`                        | prose written by hand or by a provider                                          |
| `file_assets` (retained orders)      | `original_filename`                                      | client-supplied and frequently the user's own name                              |
| `product_events`                     | every row for the session or its drafts                  | nothing; the funnel is worthless once the id is gone                            |
| `support_events`                     | `details` → `{"redacted": true}`                         | event type, actor, timestamp — that _is_ the audit                              |

This runs for paid sessions too. None of it is an accounting field.

**The audit is not a `support_event`.** That table carries `session_id`,
`draft_id` and a free-text blob, so recording an erasure there would have
created a fresh pointer to the person who had just asked to be forgotten — by
the act of forgetting them. `erasure_audits` (migration `0027`) has no foreign
keys and no free text; the subject is `HMAC(ORDER_ACCESS_TOKEN_SECRET,
"episto.erasure-audit.v1:" || session_id)`, which lets support answer "was this
session erased?" while still holding the id, and answers nothing to anyone
reading the table.

### In-flight payments and queued dispatch

**Erasure waits for the order; it does not race it.** If any draft in the
session has a payment in `pending`/`authorized`/`refund_pending`, or a dispatch
in `queued`/`unknown`, the whole erasure is refused with
`ERASURE_BLOCKED_IN_FLIGHT` (409) and nothing is touched.

That is a real refusal, not a deferral, and it is the right trade: the wait is
bounded — a payment intent expires, and the liveness sweep resolves a stuck
dispatch within ten minutes — while FADP and GDPR measure erasure in weeks. The
alternative is scrubbing the letter underneath a worker that is about to post
it, which is how a user ends up charged for a letter nobody can reconstruct, or
refunded for one Swiss Post delivered. The operator retries; the user loses
nothing.

Retention classification was also wrong in a way that only showed up on
retries: it asked the _latest_ payment row per draft. A user who pays, is
refunded, then retries with a card that declines leaves `failed` on top of
`refunded` — and the draft behind a real charge would have been scrubbed. It is
now "any settled payment, or any letter that left", over every row.

## Dispatch and retention

> **User story.** "I paid for a registered letter with my contract enclosed. The
> first attempt was rejected by Swiss Post weeks ago and support is retrying it
> now." That letter must not go out without the contract, and the contract must
> not be retired while the retry is queued.

Retention retires `file_assets` rows to `pending_deletion`; dispatch only ever
loads `active` ones. Five retention steps could touch a draft's enclosures, and
only three of them asked whether a dispatch was still queued — the expired-session
step and the age-only backstop had no dispatch predicate at all, which made them
the widest paths to a letter posted without its attachment.

All five now go through `asset-retention.ts`, which does two things the old
single statement could not:

1. **Locks the owning drafts** (`FOR UPDATE SKIP LOCKED`) before retiring
   anything. The dispatch side holds the matching `FOR SHARE` — explicitly in
   `submit-dispatch.worker.ts`, and for free via the erasure triggers, which
   take it before every `dispatch_attempts` insert.
2. **Retires in a separate command.** This is the part that is easy to get
   wrong. Under READ COMMITTED a command runs on the snapshot it started with,
   and PostgreSQL only re-evaluates an `UPDATE`'s predicate when the _target
   row_ was concurrently updated — which a dispatch insert never does. Folding
   `FOR UPDATE` into the same statement does not refresh it either. Only a new
   command gets a snapshot taken after the lock.

A draft whose lock a dispatch holds is skipped, counted as `deferredDrafts`, and
picked up next run. Both this and admin erasure take draft locks `ORDER BY id`,
so they queue behind each other rather than deadlock.

The other ordering — retention wins, then a dispatch runs — cannot be locked
away, so it fails loudly instead. `buildDispatchPackage` raises
`DISPATCH_ENCLOSURES_UNAVAILABLE` (409) listing every missing asset, and the
submit worker treats it as terminal: the provider is never called, the attempt
goes `queued → rejected`, an authorization is cancelled and a capture refunded,
and the job resolves instead of retrying something that can never succeed. There
is deliberately no re-render: the user's own PDF cannot be reconstructed.

`dispatch-retention.integration.test.ts` proves this against a real Postgres
with two connections. The queued-attempt guard is non-vacuous — removing it
fails three of those tests.

## Deleted on 2026-07-28

All user content in production was purged during this audit:

- 3 attachments (incl. one real contract with 12,000 chars of extracted text)
- 5 signature images
- 4 rendered letters
- all `extracted_text` — verified 0 rows remaining

Retained: `receipts/fa64635d-….pdf`, one VAT receipt.

## Still open

- **No zero-retention agreement with Azure for prompt content.** Attachment text
  reaches Azure in the prompt; the project-agent adapter deletes its thread
  best-effort, which is not the same as a contractual guarantee. Until that is
  in place, our deletion claims stop at our own systems and should be worded
  that way.
- **Object-storage versioning and backups are not covered.** `deleteObject`
  removes the current object; if MinIO versioning or a bucket/DB backup is ever
  enabled, prior versions survive every sweep above. Needs a lifecycle rule and
  a documented backup purge before that happens.
- `draft_letters.body` and `recipient_profiles` / `sender_profiles` hold names
  and addresses on their own lifecycle, which this audit did not cover.
- **The sweep/upload race is narrowed, not closed.** Ownership is re-checked
  immediately before the delete, but a writer can still commit its row in the
  gap between that check and `deleteObject`. Closing it properly needs a
  per-key advisory lock held across commit and delete. In practice the object
  must also be older than the one-hour grace window, which makes the window
  very hard to reach — but it is not zero.
- **A dispatch that loses its enclosure fails rather than sending a short
  letter, but the user still has to hear about it from support.** The refund is
  automatic; the explanation is not.
- **The orphan-object sweep is still check-then-delete.** A render can upload
  its deterministic key after the sweep's final ownership check and before its
  `file_assets` row commits; the sweep would then delete an object a live row
  points at. Same pattern in `withOrphanCleanup`. Needs a per-storage-key
  advisory lock shared by registration and sweeping.
- **Erasure does not reach outside Postgres.** Object deletion still goes
  through the `pending_deletion` sweep rather than a transactional outbox, and a
  queued BullMQ email job holds the recipient address in Redis, where nothing
  scrubs it. Both are bounded by their own TTLs; neither is driven by the
  erasure. A transactional outbox with an `external_cleanup_pending` status is
  the fix.
- **Anti-abuse still keys off raw identifiers.** Rate limiting reads
  `phone_verifications.phone_e164` and IPs directly, so an erased user is also
  an un-rate-limited one. The design is an `abuse_signals` table keyed by
  `HMAC(secret, E.164)` and by HMAC of the IPv4 `/24` or IPv6 `/64`, with
  counters aged out at 24h / 30d / 90d — nothing raw retained. Not built.
- The privacy page still states no concrete period.
- OCR (Azure Document Intelligence) is not configured in production, so every
  photo and scanned PDF is guaranteed unreadable. The user is now told so, but
  the underlying capability gap remains.
