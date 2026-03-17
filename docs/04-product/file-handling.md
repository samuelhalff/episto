# File Handling and Upload Rules

> All limits below are **provisional — configurable** via environment variables.
> They must not be hardcoded as magic numbers in application logic.

## Objective

Define how attachments, signatures, and rendered files behave so implementation stays safe and
consistent.

## File categories

| Category | Purpose | Storage key pattern |
|---|---|---|
| `attachment` | Supporting documents sent with the letter | `attachments/{sessionId}/{fileId}` |
| `signature_image` | User-uploaded handwritten signature image | `signatures/{sessionId}/{fileId}` |
| `rendered_pdf` | Final derived PDF artifact | `renders/{draftId}/{renderVersion}.pdf` |

## Locked limits (provisional — configurable) — GAP-9

| Parameter | Locked provisional value | Config key |
|---|---|---|
| Max file size per attachment | **5 MB** | `MAX_ATTACHMENT_FILE_BYTES` |
| Max attachments per draft | **5** | `MAX_ATTACHMENTS_PER_DRAFT` |
| Max total upload per draft | **20 MB** | `MAX_TOTAL_UPLOAD_BYTES` |
| Max signature image size | **2 MB** | `MAX_SIGNATURE_FILE_BYTES` |
| Max body characters | **10,000** | `MAX_BODY_CHARS` |
| Max subject characters | **200** | `MAX_SUBJECT_CHARS` |

These values are locked as provisional defaults. Any change requires a documented decision with
rationale — do not adjust silently.

## Allowed MIME types

### Attachments

| MIME type | Notes |
|---|---|
| `application/pdf` | Primary format |
| `image/png` | |
| `image/jpeg` | Includes `.jpg` and `.jpeg` extensions |

### Signature images

| MIME type | Notes |
|---|---|
| `image/png` | Preferred |
| `image/jpeg` | |

Do not add office formats (`.docx`, `.xlsx`, etc.) until the provider path and any conversion
model are explicitly decided and documented.

## Handling rules

- All uploads go to object storage — never to database blobs
- Every file gets a canonical metadata record in the `file_assets` table
- Every file belongs to a session or draft; orphaned files are a bug
- Every file has an explicit deletion policy set at creation time

## Security rules

- Validate MIME type on both extension and content inspection (magic bytes)
- Enforce size limits at the upload edge (HTTP layer) and again at the backend handler
- Never trust client-supplied MIME type or file name alone
- If malware scanning is added, quarantine before accepting into storage

## Usage rules

- Attachments are referenced from the draft, not embedded inline into the letter layout
- The letter body may mention enclosures even if no files have been uploaded
- Signature images are separate assets and must be normalized (dimensions, DPI) before rendering
- Rendered PDFs are derived artifacts and can always be regenerated while source data exists

## Deletion rules

- File deletion must be job-driven, logged, and auditable
- Deleting a file metadata record without deleting the object storage object is a bug
- Retaining file objects in storage after their policy expiry is a bug
- Deletion jobs must be idempotent
